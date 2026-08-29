# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A political/electoral field-organizing CRM ("Estructura Política") for Mexico. It tracks a canvassing
hierarchy of people (`presidente` → `coordinador_distrito` → `rd` → `operador` → `promotor`) who each
register `promovidos` (canvassed voters/sympathizers) within a territory (`State` → `Municipality` →
`Demarcacion` → `SeccionElectoral`), and renders a "semáforo" (red/yellow/green) progress map against
per-territory goals. There's also a separate offline-first PWA for `promotores` that syncs through a
JSON API.

Stack: Laravel 13 (PHP 8.3) + Inertia 3 + React 19, Ant Design 5 / Pro Components (`ProTable`-driven
CRUD screens), Leaflet for maps, Tailwind 4, Recharts. Database is **PostgreSQL with PostGIS**
(`demarcaciones.geom` / `secciones_electorales.geom`; queries use `ST_Transform`/`ST_AsGeoJSON`).

## Commands

```bash
# Setup
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed

# Dev (server + queue listener + pail logs + vite, all concurrently)
composer dev

# Tests (PHPUnit, not Pest)
composer test                                  # full suite
php artisan test                               # equivalent
php artisan test --filter=TerritoryScopeTest   # single test class
php artisan test --filter=test_method_name     # single test method
php artisan test tests/Feature/MapaTest.php    # single file

# Lint / format
vendor/bin/pint                 # PHP (Laravel preset, see .styleci.yml)
npm run format                  # Prettier + Tailwind class sorting (resources/**)
npm run format:check

# Frontend build
npm run dev                     # Vite dev server
npm run build                   # Production build
```

Test DB is PostgreSQL (`DB_DATABASE=testing`, configured in `phpunit.xml`) — PostGIS-dependent tests
(map/geometry) need an actual PostGIS-enabled Postgres, not SQLite. Sail/`compose.yaml` provides a
`postgis/postgis:16-3.4` service if you need a local one.

The PWA at `public/app-promotores/` is a **pre-built** artifact (its own separate frontend project, not
part of this repo's Vite build) served via the catch-all route `GET /app-promotores/{any?}`. Don't edit
its `assets/*.js` directly — those are compiled output from elsewhere.

## Architecture

### Territory-scoped multi-tenancy — the core mechanism

Almost every feature is downstream of one idea: each `presidente` is the root of an isolated
organization, and everything below them (coordinadores, RDs, operadores, promotores, promovidos,
apoyos, activity logs) is implicitly scoped to that `presidente_id`. This scoping is enforced/derived
in **three separate places** that must be kept consistent when touching access rules:

1. **`App\Models\Scopes\TerritoryScope`** — a global scope attached to `User` and `Promovido`
   (`static::addGlobalScope(new TerritoryScope)` in each model's `boot()`). Applied automatically on
   every query unless `withoutGlobalScopes()` is used. Behavior branches on `$user->role` and
   `$user->scope_level` (`estatal` / `municipal` / `demarcacion`), filtering by whichever of
   `presidente_id` / `state_id` / `municipality_id` / `demarcacion_id` / `parent_id` exist on the
   target table (see `hasColumn()`'s hardcoded table→column map — add new scoped tables/columns there
   too). Superusers bypass it entirely. Disabled during console commands (except in tests) since there's
   no authenticated user.
2. **`User::getPresidenteId()`** — resolves the "root presidente" for any user by walking up
   `presidente_id` → `parent_id` → (for `coordinador_distrito`) matching by municipality/state. Called
   constantly across controllers; expensive-ish (does DB lookups), so avoid calling it in tight loops.
3. **Per-role query helpers on `User`**: `queryPromotores()`, `queryOperadores()`, `queryPromovidos()`,
   `queryCoordinadores()` — hand-rolled scoping (not relying on the global scope) used by controllers
   and the API dashboard, because Eloquent's native relations can't express the multi-level
   `hasManyThrough`-style hierarchy needed here (e.g. an RD's promovidos come through both their
   operadores' promotores AND their direct promotores).

`BaseCrudController::getBaseQuery()` *also* independently re-implements a presidente/parent scoping
check for `presidente`/`coordinador_distrito` roles. When adding a new scoped resource, check whether
you need to touch the global scope's column map, the relevant `query*()` helper, and the controller's
`getBaseQuery()` override — they don't share code.

**Composite uniqueness for CURP / clave_electoral is per-presidente, not global.** Enforced manually in
`User`/`Promovido` `boot()` `saving()` hooks (raw `ValidationException` throws) rather than DB unique
constraints, because uniqueness scope differs by role (presidente-level uniqueness is global among
presidentes; everyone else is unique within their presidente's org). See
`2026_08_26_000001_update_unique_indexes_for_presidente_scope.php` and `CompositeUniquenessTest`.
Validation-layer `Rule::unique()` calls in controllers (e.g. `PromotorController`) must match this same
scoping or duplicate errors will surface late (at save time) instead of at request-validation time.

### Controller pattern: `BaseCrudController`

Every catalog controller (`PresidenteController`, `CoordinadorDistritoController`, `OperadorController`,
`PromotorController`, `PromovidoController`, `RepresentanteDemarcacionController`, `DemarcacionController`)
extends `App\Http\Controllers\BaseCrudController`, which implements index/store/show/update/destroy/
restore/export(CSV) generically. Subclasses override:
- `getBaseQuery()` — role-based visibility (most also delegate to `queryPromotores()` etc. on `User`)
- `checkAccess()` — `abort_if` role gate, called at the top of every action
- `getValidationRules()` / `getValidationMessages()`
- `applySearch()` / `applyFilters()` — column filters come in as flat query params (ProTable sends
  `?nombre=Juan&telefono=123`), not a nested `filters[]` structure
- `afterStore()` / `afterUpdate()` — hierarchy assignment (`parent_id`), photo upload handling
- `getExportHeaders()` / `getExportRow()` — CSV export

`index()` returns JSON when `$request->wantsJson()` (async `ProTable` requests) and an Inertia page
otherwise — same endpoint serves both the initial page load and subsequent table interactions.

Users (`presidente`, `promotor`, etc.) are all rows in the single `users` table, distinguished by the
`role` enum column (`App\Enums\UserRole`) — there's no STI/separate tables. `nombre`/`apellidos` are the
editable name fields; `name` is a derived concatenation kept in sync manually by controllers on
store/update (not a computed accessor).

### Auth: two parallel systems

- **Web (Inertia)**: standard Laravel session auth (`WebController::login`), used by the React SPA at
  `resources/js/Pages/*`.
- **API (mobile/PWA)**: Sanctum token auth (`Api\V1\DashboardController::login`, `/api/mobile/login`),
  used by the offline-first promotor app. `Api\MobileSyncController::syncPromovidos` does bulk
  `updateOrCreate` of promovidos captured offline (matches by CURP, then clave_elector, then
  nombre+apellidos fallback) and decodes base64-embedded photos/INE images via
  `processBase64Image()`.

Both logins hit `DashboardController::login` — the web app doesn't use it, but the JSON API (used by
both `/api/v1/auth/login` and `/api/mobile/login`) does.

### Impersonation

`ImpersonateController` lets `canImpersonate()`-authorized users (currently hardcoded to `superuser`
only, with a scaffolded-but-inactive `presidente` self-org path in `User::canImpersonate()`) log in as
another user via `Auth::login()`, tracked with `session('impersonated_by')`. Returning
(`leave()`) must look up the original user with `User::withoutGlobalScopes()` since the active session's
`TerritoryScope` reflects the impersonated (usually more restricted) user, which would otherwise hide
the original superuser account from the lookup. Every take/leave is written to `ActivityLog`.

### Activity logging

`App\Traits\LogsActivity` (used by `User`, `Promovido`, `Demarcacion`, `Apoyo`) hooks Eloquent
`created`/`updating`/`deleted` events and writes to `activity_logs`, diffing dirty attributes and
skipping hidden/timestamp fields. This is automatic — don't manually log CRUD operations on these
models.

### Map data (`WebController::mapa`, `Pages/Mapa.jsx`)

Demarcaciones/secciones carry PostGIS `geom`; the controller reprojects to WGS84 and emits GeoJSON
(`ST_AsGeoJSON(ST_Transform(geom, 4326))`) for Leaflet. Progress % per territory is `promovidos_count /
meta * 100`, where `meta` can be overridden per-presidente via the `demarcacion_presidente` /
`seccion_electoral_presidente` pivot tables (`Demarcacion::getMetaForPresidente()`,
`User::demarcacionesMetas()`/`seccionesMetas()`) — falls back to the table's own `meta` column
(defaults 500/50) when no presidente-specific override exists. Color thresholds are hardcoded:
<40% red, ≤60% yellow, >60% green (duplicated between demarcaciones and secciones blocks in
`WebController::mapa` — keep both in sync if this changes). `superuser`/`admin` can switch which
municipality they're viewing (`canSwitchMunicipality`); everyone else is locked to their own.

### Frontend conventions

- Pages live in `resources/js/Pages/<Feature>/Index.jsx`, matched by name string to
  `Inertia::render('Feature/Index')` on the backend.
- `TableCrud.jsx` wraps Ant Design's `ProTable` and supports two modes: **Inertia mode** (`data` prop is
  a Laravel paginator, filtering resubmits the Inertia form) and **async mode** (`endpoint` prop, table
  fetches its own JSON via axios — used by API-backed dashboards). Column filter submission is
  debounced 500ms.
- `MainLayout.jsx` derives visible nav items from `auth.user.role` (shared via
  `HandleInertiaRequests::share()`, which also eager-loads `state`/`municipality`/`demarcacion`/
  `presidente` on the user and backfills missing `presidente_id`/territory fields for
  `coordinador_distrito` users on every request).
- `IneScanner.jsx` / `IneExtractionController` do OCR extraction from INE (Mexican voter ID) photos to
  autofill CURP/clave_elector/name fields.

### Root-level PHP scripts

`compare_munis.php`, `fetch_inegi.php`, `fill_operadores.php`, `test_dashboard.php` at the repo root are
one-off data/maintenance scripts (INEGI catalog import, municipality coordinate backfill, etc.), not
part of the app's autoloaded/tested code. Treat them as historical artifacts, not a pattern to follow.
