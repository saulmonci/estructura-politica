<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Promovido;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CaceriaController extends Controller
{
    /**
     * Verificar que el usuario tenga acceso al módulo de cacería.
     * Restringido temporalmente a Presidente, Superuser y Admin.
     */
    protected function checkAccess(User $user): void
    {
        abort_if(
            ! in_array($user->role, [
                UserRole::PRESIDENTE,
                UserRole::SUPERUSER,
                UserRole::ADMIN,
            ], true),
            403,
            'No tienes autorización para acceder al módulo de Cacería Electoral.'
        );
    }

    /**
     * Resuelve el ID del presidente para el scope actual.
     */
    protected function resolvePresidenteId(User $user, Request $request): ?int
    {
        if ($user->role === UserRole::PRESIDENTE) {
            return $user->id;
        }

        // Si es superuser o admin, puede ver el presidente seleccionado o el primero disponible
        if (in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $requestedId = $request->input('presidente_id');
            if ($requestedId && (int) $requestedId > 0) {
                return (int) $requestedId;
            }

            $userPresId = $user->getPresidenteId();
            if ($userPresId) {
                return $userPresId;
            }

            // Primer presidente encontrado
            return User::withoutGlobalScopes()
                ->where('role', UserRole::PRESIDENTE)
                ->whereNull('deleted_at')
                ->value('id');
        }

        return $user->getPresidenteId();
    }

    /**
     * Vista principal y datos del módulo de Cacería (Día D).
     */
    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        $this->checkAccess($user);

        $presidenteId = $this->resolvePresidenteId($user, $request);

        // 1. Estadísticas en tiempo real
        $stats = $this->getStats($presidenteId);

        // 2. Consulta de votantes con filtros
        $paginator = $this->buildVotersQuery($request, $presidenteId)->paginate(
            (int) $request->input('per_page', 25)
        )->withQueryString();

        // 3. Catálogos para filtros
        $demarcaciones = $this->getDemarcacionesForFilter($presidenteId);
        $secciones = $this->getSeccionesForFilter($presidenteId);

        // Lista de presidentes disponibles si es superuser o admin
        $presidentesList = [];
        if (in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $presidentesList = User::withoutGlobalScopes()
                ->where('role', UserRole::PRESIDENTE)
                ->whereNull('deleted_at')
                ->get(['id', 'name']);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $paginator->items(),
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
                'stats' => $stats,
            ]);
        }

        return Inertia::render('Caceria/Index', [
            'voters' => $paginator,
            'stats' => $stats,
            'filters' => $request->only(['search', 'tipo', 'estatus', 'demarcacion_id', 'seccion_electoral', 'presidente_id', 'per_page']),
            'demarcaciones' => $demarcaciones,
            'secciones' => $secciones,
            'presidentesList' => $presidentesList,
            'selectedPresidenteId' => $presidenteId,
        ]);
    }

    /**
     * Obtener métricas en tiempo real de participación electoral (Día D).
     */
    public function getStats(?int $presidenteId = null): array
    {
        // 1. Estructura: coordinadores, rds, operadores, promotores
        $structureRoles = [
            UserRole::COORDINADOR_DISTRITO->value,
            UserRole::RD->value,
            UserRole::OPERADOR->value,
            UserRole::PROMOTOR->value,
        ];

        $usersBase = DB::table('users')
            ->whereNull('deleted_at')
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->whereIn('role', $structureRoles);

        $totalEstructura = (clone $usersBase)->count();
        $votaronEstructura = (clone $usersBase)->where('ha_votado', true)->count();
        $faltanEstructura = max(0, $totalEstructura - $votaronEstructura);
        $pctEstructura = $totalEstructura > 0 ? round(($votaronEstructura / $totalEstructura) * 100, 1) : 0.0;

        // Desglose por cada rol de la estructura
        $rolesBreakdown = (clone $usersBase)
            ->select('role', DB::raw('count(*) as total'), DB::raw('sum(case when ha_votado then 1 else 0 end) as votaron'))
            ->groupBy('role')
            ->get()
            ->keyBy('role');

        // 2. Promovidos
        $promovidosBase = DB::table('promovidos')
            ->whereNull('deleted_at')
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId));

        $totalPromovidos = (clone $promovidosBase)->count();
        $votaronPromovidos = (clone $promovidosBase)->where('ha_votado', true)->count();
        $faltanPromovidos = max(0, $totalPromovidos - $votaronPromovidos);
        $pctPromovidos = $totalPromovidos > 0 ? round(($votaronPromovidos / $totalPromovidos) * 100, 1) : 0.0;

        // 3. Totales Globales
        $totalGeneral = $totalEstructura + $totalPromovidos;
        $votaronGeneral = $votaronEstructura + $votaronPromovidos;
        $faltanGeneral = max(0, $totalGeneral - $votaronGeneral);
        $pctGeneral = $totalGeneral > 0 ? round(($votaronGeneral / $totalGeneral) * 100, 1) : 0.0;

        return [
            'total_general' => $totalGeneral,
            'votaron_general' => $votaronGeneral,
            'faltan_general' => $faltanGeneral,
            'pct_general' => $pctGeneral,

            'total_estructura' => $totalEstructura,
            'votaron_estructura' => $votaronEstructura,
            'faltan_estructura' => $faltanEstructura,
            'pct_estructura' => $pctEstructura,

            'total_promovidos' => $totalPromovidos,
            'votaron_promovidos' => $votaronPromovidos,
            'faltan_promovidos' => $faltanPromovidos,
            'pct_promovidos' => $pctPromovidos,

            'desglose_roles' => [
                'coordinador_distrito' => [
                    'nombre' => 'Coordinadores',
                    'total' => (int) ($rolesBreakdown['coordinador_distrito']->total ?? 0),
                    'votaron' => (int) ($rolesBreakdown['coordinador_distrito']->votaron ?? 0),
                ],
                'rd' => [
                    'nombre' => 'Representantes (RD)',
                    'total' => (int) ($rolesBreakdown['rd']->total ?? 0),
                    'votaron' => (int) ($rolesBreakdown['rd']->votaron ?? 0),
                ],
                'operador' => [
                    'nombre' => 'Operadores',
                    'total' => (int) ($rolesBreakdown['operador']->total ?? 0),
                    'votaron' => (int) ($rolesBreakdown['operador']->votaron ?? 0),
                ],
                'promotor' => [
                    'nombre' => 'Promotores',
                    'total' => (int) ($rolesBreakdown['promotor']->total ?? 0),
                    'votaron' => (int) ($rolesBreakdown['promotor']->votaron ?? 0),
                ],
            ],
        ];
    }

    /**
     * Construye la consulta unificada de votantes según los filtros dados.
     */
    protected function buildVotersQuery(Request $request, ?int $presidenteId)
    {
        $tipo = $request->input('tipo', 'todos');
        $structureRoles = [
            UserRole::COORDINADOR_DISTRITO->value,
            UserRole::RD->value,
            UserRole::OPERADOR->value,
            UserRole::PROMOTOR->value,
        ];

        // Consulta de estructura (users)
        $usersQuery = DB::table('users')
            ->leftJoin('demarcaciones', DB::raw('COALESCE(users.demarcacion_id, users.demarcacion_asignada_id)'), '=', 'demarcaciones.id')
            ->leftJoin('users as marcado_por', 'users.marcado_por_id', '=', 'marcado_por.id')
            ->leftJoin('users as supervisor', 'users.parent_id', '=', 'supervisor.id')
            ->select([
                'users.id',
                DB::raw("'user' as source_type"),
                'users.role',
                DB::raw("COALESCE(NULLIF(TRIM(CONCAT(users.nombre, ' ', users.apellidos)), ''), users.name) as nombre_completo"),
                'users.curp',
                'users.clave_electoral as clave_elector',
                'users.telefono',
                DB::raw('COALESCE(users.demarcacion_id, users.demarcacion_asignada_id) as demarcacion_id'),
                'demarcaciones.nombre as demarcacion_nombre',
                'users.seccion_electoral',
                'users.colonia',
                'users.calle',
                'users.ha_votado',
                'users.voto_at',
                'marcado_por.name as marcado_por_nombre',
                'supervisor.name as responsable_nombre',
                'users.created_at',
            ])
            ->whereNull('users.deleted_at')
            ->when($presidenteId, fn ($q) => $q->where('users.presidente_id', $presidenteId));

        if (in_array($tipo, $structureRoles, true)) {
            $usersQuery->where('users.role', $tipo);
        } else {
            $usersQuery->whereIn('users.role', $structureRoles);
        }

        // Consulta de promovidos
        $promQuery = DB::table('promovidos')
            ->leftJoin('demarcaciones', 'promovidos.demarcacion_id', '=', 'demarcaciones.id')
            ->leftJoin('users as marcado_por', 'promovidos.marcado_por_id', '=', 'marcado_por.id')
            ->leftJoin('users as promotor', 'promovidos.promotor_id', '=', 'promotor.id')
            ->select([
                'promovidos.id',
                DB::raw("'promovido' as source_type"),
                DB::raw("'promovido' as role"),
                DB::raw("TRIM(CONCAT(promovidos.nombre, ' ', promovidos.apellidos)) as nombre_completo"),
                'promovidos.curp',
                'promovidos.clave_elector',
                'promovidos.telefono',
                'promovidos.demarcacion_id',
                'demarcaciones.nombre as demarcacion_nombre',
                'promovidos.seccion_electoral',
                'promovidos.colonia',
                'promovidos.calle',
                'promovidos.ha_votado',
                'promovidos.voto_at',
                'marcado_por.name as marcado_por_nombre',
                'promotor.name as responsable_nombre',
                'promovidos.created_at',
            ])
            ->whereNull('promovidos.deleted_at')
            ->when($presidenteId, fn ($q) => $q->where('promovidos.presidente_id', $presidenteId));

        // Determinar qué conjunto consultar
        if ($tipo === 'promovidos') {
            $baseSubquery = $promQuery;
        } elseif ($tipo === 'estructura' || in_array($tipo, $structureRoles, true)) {
            $baseSubquery = $usersQuery;
        } else {
            // 'todos'
            $baseSubquery = $usersQuery->unionAll($promQuery);
        }

        $query = DB::query()->fromSub($baseSubquery, 'voters');

        // Filtro por estatus de voto
        $estatus = $request->input('estatus');
        if ($estatus === 'pendientes') {
            $query->where('voters.ha_votado', false);
        } elseif ($estatus === 'votaron') {
            $query->where('voters.ha_votado', true);
        }

        // Filtro por demarcación
        if ($demId = $request->input('demarcacion_id')) {
            $query->where('voters.demarcacion_id', (int) $demId);
        }

        // Filtro por sección electoral
        if ($seccion = $request->input('seccion_electoral')) {
            $query->where('voters.seccion_electoral', $seccion);
        }

        // Búsqueda en vivo
        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $term = "%{$search}%";
                $q->where('voters.nombre_completo', 'ilike', $term)
                    ->orWhere('voters.curp', 'ilike', $term)
                    ->orWhere('voters.clave_elector', 'ilike', $term)
                    ->orWhere('voters.telefono', 'ilike', $term)
                    ->orWhere('voters.colonia', 'ilike', $term)
                    ->orWhere('voters.seccion_electoral', 'ilike', $term);
            });
        }

        // Ordenamiento
        $sortField = $request->input('sort_field');
        $sortDir = strtolower($request->input('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        if ($sortField && in_array($sortField, ['nombre_completo', 'seccion_electoral', 'ha_votado', 'voto_at', 'role'], true)) {
            $query->orderBy("voters.{$sortField}", $sortDir);
        } else {
            // Por defecto: pendientes primero, luego orden alfabético
            $query->orderBy('voters.ha_votado', 'asc')
                ->orderBy('voters.nombre_completo', 'asc');
        }

        return $query;
    }

    /**
     * Alternar el estado de voto ("Check") de un promovido o usuario de la estructura.
     */
    public function toggleVoto(Request $request)
    {
        /** @var User $authUser */
        $authUser = Auth::user();
        $this->checkAccess($authUser);

        $request->validate([
            'id' => 'required|integer',
            'source_type' => 'required|in:user,promovido',
            'ha_votado' => 'nullable|boolean',
        ]);

        $presidenteId = $this->resolvePresidenteId($authUser, $request);

        if ($request->source_type === 'user') {
            $model = User::withoutGlobalScopes()->whereNull('deleted_at')->findOrFail($request->id);
        } else {
            $model = Promovido::withoutGlobalScopes()->whereNull('deleted_at')->findOrFail($request->id);
        }

        // Validar tenant
        if ($authUser->role !== UserRole::SUPERUSER && $model->presidente_id != $presidenteId) {
            abort(403, 'No tienes permiso para modificar este registro.');
        }

        // Si se envió el valor específico se usa, de lo contrario se invierte
        $newVotado = $request->has('ha_votado') ? (bool) $request->ha_votado : ! $model->ha_votado;

        $model->ha_votado = $newVotado;
        $model->voto_at = $newVotado ? Carbon::now() : null;
        $model->marcado_por_id = $newVotado ? $authUser->id : null;
        $model->save();

        $stats = $this->getStats($presidenteId);

        $payload = [
            'success' => true,
            'id' => $model->id,
            'source_type' => $request->source_type,
            'ha_votado' => $model->ha_votado,
            'voto_at' => $model->voto_at ? $model->voto_at->format('Y-m-d H:i:s') : null,
            'marcado_por_nombre' => $newVotado ? $authUser->name : null,
            'stats' => $stats,
            'message' => $newVotado ? 'Voto registrado exitosamente.' : 'Check de voto retirado.',
        ];

        if ($request->wantsJson()) {
            return response()->json($payload);
        }

        return back()->with('success', $payload['message']);
    }

    /**
     * Exportar lista de cacería en CSV (filtrada).
     */
    public function export(Request $request): StreamedResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $this->checkAccess($user);

        $presidenteId = $this->resolvePresidenteId($user, $request);
        $voters = $this->buildVotersQuery($request, $presidenteId)->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="caceria_dia_d_'.date('Y-m-d_His').'.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($voters) {
            $handle = fopen('php://output', 'w');
            // BOM UTF-8 para Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'ID',
                'Tipo',
                'Rol',
                'Nombre Completo',
                'Teléfono',
                'CURP',
                'Clave Elector',
                'Demarcación',
                'Sección',
                'Colonia',
                'Calle',
                'Ha Votado',
                'Hora de Voto',
                'Marcado Por',
                'Responsable',
            ]);

            $roleLabels = [
                'coordinador_distrito' => 'Coordinador de Distrito',
                'rd' => 'Representante de Demarcación',
                'operador' => 'Operador Político',
                'promotor' => 'Promotor',
                'promovido' => 'Promovido',
            ];

            foreach ($voters as $voter) {
                fputcsv($handle, [
                    $voter->id,
                    $voter->source_type === 'user' ? 'Estructura' : 'Promovido',
                    $roleLabels[$voter->role] ?? $voter->role,
                    $voter->nombre_completo,
                    $voter->telefono ?: '',
                    $voter->curp ?: '',
                    $voter->clave_elector ?: '',
                    $voter->demarcacion_nombre ?: '',
                    $voter->seccion_electoral ?: '',
                    $voter->colonia ?: '',
                    $voter->calle ?: '',
                    $voter->ha_votado ? 'SÍ' : 'NO',
                    $voter->voto_at ? Carbon::parse($voter->voto_at)->format('d/m/Y H:i') : '',
                    $voter->marcado_por_nombre ?: '',
                    $voter->responsable_nombre ?: '',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Obtener demarcaciones para el filtro.
     */
    protected function getDemarcacionesForFilter(?int $presidenteId): array
    {
        return Demarcacion::query()
            ->orderBy('id')
            ->get(['id', 'nombre'])
            ->map(fn ($d) => [
                'value' => $d->id,
                'label' => $d->nombre,
            ])
            ->toArray();
    }

    /**
     * Obtener secciones electorales únicas para el filtro.
     */
    protected function getSeccionesForFilter(?int $presidenteId): array
    {
        $seccionesUsers = DB::table('users')
            ->whereNull('deleted_at')
            ->whereNotNull('seccion_electoral')
            ->where('seccion_electoral', '!=', '')
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->pluck('seccion_electoral');

        $seccionesProm = DB::table('promovidos')
            ->whereNull('deleted_at')
            ->whereNotNull('seccion_electoral')
            ->where('seccion_electoral', '!=', '')
            ->when($presidenteId, fn ($q) => $q->where('presidente_id', $presidenteId))
            ->pluck('seccion_electoral');

        return $seccionesUsers->concat($seccionesProm)
            ->unique()
            ->sort()
            ->values()
            ->map(fn ($s) => [
                'value' => (string) $s,
                'label' => 'Sección '.$s,
            ])
            ->toArray();
    }
}
