<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Exceptions\InvalidGeoJsonException;
use App\Models\Demarcacion;
use App\Models\User;
use App\Services\GeoJsonUploadService;
use App\Traits\LogsGeomUpload;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DemarcacionController extends BaseCrudController
{
    use LogsGeomUpload;

    protected string $modelClass = Demarcacion::class;

    protected string $indexView = 'Demarcaciones/Index';

    protected string $dataKey = 'demarcaciones';

    protected function checkAccess(Request $request): void
    {
        // Solo el Presidente, Coordinadores o Administradores tienen acceso para administrar las demarcaciones
        abort_if(! $request->user() || ! in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::ADMIN, UserRole::SUPERUSER], true), 403, 'Acceso denegado. Solo los administradores pueden administrar las demarcaciones.');
    }

    protected function resolvePresidenteId(Request $request): ?int
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            return $user->getPresidenteId();
        }

        if ($request->filled('presidente_id')) {
            return (int) $request->input('presidente_id');
        }

        return null;
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $presidenteId = $this->resolvePresidenteId($request);
        $user = $request->user();

        $query = Demarcacion::query();

        // Si el usuario o el presidente tienen municipio asignado, filtrar demarcaciones de ese municipio
        $municipalityId = null;
        if ($user && in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $municipalityId = $user->municipality_id;
            if (! $municipalityId && $presidenteId) {
                $pres = User::withoutGlobalScopes()->find($presidenteId);
                $municipalityId = $pres?->municipality_id;
            }
        } elseif ($request->filled('municipality_id')) {
            $municipalityId = (int) $request->input('municipality_id');
        } elseif ($presidenteId) {
            $pres = User::withoutGlobalScopes()->find($presidenteId);
            $municipalityId = $pres?->municipality_id;
        }

        if ($municipalityId) {
            $query->where('demarcaciones.municipality_id', $municipalityId);
        }

        if ($presidenteId) {
            $query->leftJoin('demarcacion_presidente', function ($join) use ($presidenteId) {
                $join->on('demarcaciones.id', '=', 'demarcacion_presidente.demarcacion_id')
                    ->where('demarcacion_presidente.presidente_id', '=', $presidenteId);
            })
                ->select(
                    'demarcaciones.id',
                    'demarcaciones.nombre',
                    'demarcaciones.municipality_id',
                    'demarcaciones.created_at',
                    'demarcaciones.updated_at',
                    DB::raw('COALESCE(demarcacion_presidente.meta, demarcaciones.meta, 500) as meta'),
                    DB::raw('CASE WHEN demarcacion_presidente.id IS NOT NULL THEN true ELSE false END as is_custom_meta')
                );
        } else {
            $query->select(
                'demarcaciones.id',
                'demarcaciones.nombre',
                'demarcaciones.municipality_id',
                'demarcaciones.created_at',
                'demarcaciones.updated_at',
                'demarcaciones.meta',
                DB::raw('false as is_custom_meta')
            );
        }

        return $query;
    }

    public function index(Request $request)
    {
        $this->checkAccess($request);
        $user = $request->user();
        $isGlobalAdmin = in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true);

        // Si es una petición JSON (del TableCrud / ProTable)
        if ($request->wantsJson()) {
            return parent::index($request);
        }

        // Obtener lista de presidentes para que Admins/Superusers puedan seleccionar
        $presidentes = [];
        if ($isGlobalAdmin) {
            $presidentes = User::where('role', UserRole::PRESIDENTE)
                ->select('id', 'name', 'nombre', 'apellidos', 'municipality_id')
                ->with('municipality:id,nombre')
                ->orderBy('name')
                ->get();
        }

        $currentPresidenteId = $this->resolvePresidenteId($request);

        $query = $this->getBaseQuery($request);
        $perPage = min((int) $request->input('per_page', 10), 100);
        $items = $query->paginate($perPage)->withQueryString();

        return Inertia::render($this->indexView, [
            $this->dataKey => $items,
            'presidentes' => $presidentes,
            'currentPresidenteId' => $currentPresidenteId,
            'isGlobalAdmin' => $isGlobalAdmin,
        ]);
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function ($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(demarcaciones.nombre) LIKE ?', ["%{$searchLower}%"])
                ->orWhere('demarcaciones.id', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        if (isset($filters['nombre']) && $filters['nombre'] !== '') {
            $valLower = strtolower($filters['nombre']);
            $query->whereRaw('LOWER(demarcaciones.nombre) LIKE ?', ["%{$valLower}%"]);
        }

        if (isset($filters['meta']) && $filters['meta'] !== '') {
            $query->where(function ($q) use ($filters) {
                $q->where('demarcacion_presidente.meta', $filters['meta'])
                    ->orWhere('demarcaciones.meta', $filters['meta']);
            });
        }
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        $rules = [
            'nombre' => ['required', 'string', 'max:255'],
            'meta' => ['required', 'integer', 'min:0'],
            'presidente_id' => ['nullable', 'integer', 'exists:users,id'],
            'municipality_id' => ['nullable', 'integer', 'exists:municipalities,id'],
        ];

        if (! $id) {
            $rules['id'] = ['required', 'integer', 'min:1', 'unique:demarcaciones,id'];
        } else {
            $rules['id'] = ['required', 'integer', 'min:1', Rule::unique('demarcaciones', 'id')->ignore($id)];
        }

        return $rules;
    }

    protected function getValidationMessages(Request $request): array
    {
        return [
            'id.unique' => 'El número de demarcación ya está registrado.',
        ];
    }

    public function store(Request $request)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request),
            $this->getValidationMessages($request)
        );

        $presidenteId = $this->resolvePresidenteId($request);
        $user = $request->user();

        $municipalityId = $validated['municipality_id'] ?? null;
        if (! $municipalityId && $presidenteId) {
            $pres = User::withoutGlobalScopes()->find($presidenteId);
            $municipalityId = $pres?->municipality_id;
        }
        if (! $municipalityId && $user) {
            $municipalityId = $user->municipality_id;
        }

        $demarcacion = Demarcacion::create([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'meta' => $validated['meta'],
            'municipality_id' => $municipalityId,
        ]);

        if ($presidenteId) {
            DB::table('demarcacion_presidente')->updateOrInsert(
                ['presidente_id' => $presidenteId, 'demarcacion_id' => $demarcacion->id],
                ['meta' => $validated['meta'], 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return redirect()->back()->with('success', 'Demarcación creada exitosamente.');
    }

    public function update(Request $request, string $id)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request, $id),
            $this->getValidationMessages($request)
        );

        $demarcacion = Demarcacion::findOrFail($id);
        $presidenteId = $this->resolvePresidenteId($request);

        // Actualizar datos base de la demarcación
        $demarcacion->update([
            'nombre' => $validated['nombre'],
        ]);

        if ($presidenteId) {
            // Guardar meta específica para el presidente
            DB::table('demarcacion_presidente')->updateOrInsert(
                ['presidente_id' => $presidenteId, 'demarcacion_id' => $demarcacion->id],
                ['meta' => $validated['meta'], 'updated_at' => now(), 'created_at' => now()]
            );
        } else {
            // Guardar meta global base
            $demarcacion->update([
                'meta' => $validated['meta'],
            ]);
        }

        return redirect()->back()->with('success', 'Demarcación actualizada exitosamente.');
    }

    public function show(Request $request, string $id)
    {
        $this->checkAccess($request);
        $item = $this->getBaseQuery($request)->findOrFail($id);

        return response()->json($item);
    }

    public function uploadGeom(Request $request, string $id)
    {
        $this->checkAccess($request);

        $item = $this->getBaseQuery($request)->findOrFail($id);

        try {
            $request->validate([
                'geojson' => ['required', 'file', 'max:'.GeoJsonUploadService::MAX_FILE_SIZE_KB],
            ]);
        } catch (ValidationException $e) {
            return response()->json(['success' => false, 'message' => $e->validator->errors()->first()], 422);
        }

        $file = $request->file('geojson');
        if (! in_array(strtolower($file->getClientOriginalExtension()), ['geojson', 'json'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo debe tener extensión .geojson o .json.',
            ], 422);
        }

        try {
            $result = app(GeoJsonUploadService::class)->extractGeometry($file, ['Polygon']);
        } catch (InvalidGeoJsonException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        try {
            DB::statement(
                'UPDATE demarcaciones SET geom = ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 32613) WHERE id = ?',
                [$result['geometryJson'], $item->id]
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'La geometría no pudo ser procesada por el servidor geoespacial. Verifica que el polígono esté bien formado (anillos cerrados, sin auto-intersecciones).',
            ], 422);
        }

        $this->logGeomUpload($item, 'Polygon');

        return response()->json(['success' => true, 'message' => 'Geometría de la demarcación actualizada exitosamente.']);
    }

    protected function getExportHeaders(): array
    {
        return ['ID', 'Nombre', 'Meta de Votantes', 'Fecha de Registro'];
    }

    protected function getExportRow($item): array
    {
        return [
            $item->id,
            $item->nombre,
            $item->meta,
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
