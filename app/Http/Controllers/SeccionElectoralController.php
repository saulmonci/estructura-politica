<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\SeccionElectoral;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SeccionElectoralController extends Controller
{
    /**
     * Enforce role validation.
     */
    protected function checkAccess(Request $request): void
    {
        abort_if(
            ! $request->user() || ! in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::ADMIN, UserRole::SUPERUSER], true),
            403,
            'Acceso denegado. Solo el Presidente, Coordinadores o Administradores pueden administrar las secciones electorales.'
        );
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

    /**
     * List all sections for a specific demarcation.
     */
    public function index(Request $request, $demarcacionId)
    {
        $this->checkAccess($request);
        $presidenteId = $this->resolvePresidenteId($request);

        $query = SeccionElectoral::where('demarcacion_id', $demarcacionId);

        if ($presidenteId) {
            $secciones = $query->leftJoin('seccion_electoral_presidente', function ($join) use ($presidenteId) {
                $join->on('secciones_electorales.id', '=', 'seccion_electoral_presidente.seccion_electoral_id')
                    ->where('seccion_electoral_presidente.presidente_id', '=', $presidenteId);
            })
                ->select(
                    'secciones_electorales.id',
                    'secciones_electorales.numero',
                    'secciones_electorales.ubicacion_casilla',
                    'secciones_electorales.demarcacion_id',
                    'secciones_electorales.municipality_id',
                    'secciones_electorales.state_id',
                    DB::raw('COALESCE(seccion_electoral_presidente.meta, secciones_electorales.meta, 0) as meta'),
                    DB::raw('CASE WHEN seccion_electoral_presidente.id IS NOT NULL THEN true ELSE false END as is_custom_meta')
                )
                ->orderBy('secciones_electorales.numero')
                ->get();
        } else {
            $secciones = $query->select(
                'secciones_electorales.id',
                'secciones_electorales.numero',
                'secciones_electorales.ubicacion_casilla',
                'secciones_electorales.demarcacion_id',
                'secciones_electorales.municipality_id',
                'secciones_electorales.state_id',
                'secciones_electorales.meta',
                DB::raw('false as is_custom_meta')
            )
                ->orderBy('secciones_electorales.numero')
                ->get();
        }

        return response()->json($secciones);
    }

    /**
     * Store a new section under a specific demarcation.
     */
    public function store(Request $request, $demarcacionId)
    {
        $this->checkAccess($request);

        $validated = $request->validate([
            'numero' => [
                'required',
                'string',
                'max:255',
                'unique:secciones_electorales,numero',
            ],
            'ubicacion_casilla' => ['nullable', 'string', 'max:500'],
            'meta' => ['required', 'integer', 'min:0'],
            'presidente_id' => ['nullable', 'integer', 'exists:users,id'],
        ], [
            'numero.unique' => 'El número de sección electoral ya está registrado en el sistema.',
        ]);

        $user = $request->user();
        $canEditCasilla = $user && in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true);
        $presidenteId = $this->resolvePresidenteId($request);

        $seccionData = [
            'numero' => $validated['numero'],
            'meta' => $validated['meta'],
            'demarcacion_id' => $demarcacionId,
        ];

        if ($canEditCasilla && array_key_exists('ubicacion_casilla', $validated)) {
            $seccionData['ubicacion_casilla'] = $validated['ubicacion_casilla'];
        }

        $seccion = SeccionElectoral::create($seccionData);

        if ($presidenteId) {
            DB::table('seccion_electoral_presidente')->updateOrInsert(
                ['presidente_id' => $presidenteId, 'seccion_electoral_id' => $seccion->id],
                ['meta' => $validated['meta'], 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Sección electoral agregada exitosamente.',
            'data' => $seccion,
        ]);
    }

    /**
     * Update an existing section.
     */
    public function update(Request $request, $id)
    {
        $this->checkAccess($request);

        $seccion = SeccionElectoral::findOrFail($id);
        $user = $request->user();
        $canEditCasilla = $user && in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true);
        $presidenteId = $this->resolvePresidenteId($request);

        $validated = $request->validate([
            'numero' => [
                'required',
                'string',
                'max:255',
                Rule::unique('secciones_electorales', 'numero')->ignore($id),
            ],
            'ubicacion_casilla' => ['nullable', 'string', 'max:500'],
            'meta' => ['required', 'integer', 'min:0'],
            'presidente_id' => ['nullable', 'integer', 'exists:users,id'],
        ], [
            'numero.unique' => 'El número de sección electoral ya está registrado en el sistema.',
        ]);

        $updateData = [
            'numero' => $validated['numero'],
        ];

        if ($canEditCasilla && array_key_exists('ubicacion_casilla', $validated)) {
            $updateData['ubicacion_casilla'] = $validated['ubicacion_casilla'];
        }

        $seccion->update($updateData);

        if ($presidenteId) {
            DB::table('seccion_electoral_presidente')->updateOrInsert(
                ['presidente_id' => $presidenteId, 'seccion_electoral_id' => $id],
                ['meta' => $validated['meta'], 'updated_at' => now(), 'created_at' => now()]
            );
        } else {
            $seccion->update([
                'meta' => $validated['meta'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sección electoral actualizada exitosamente.',
            'data' => $seccion,
        ]);
    }

    /**
     * Delete/remove a section.
     */
    public function destroy(Request $request, $id)
    {
        $this->checkAccess($request);

        $seccion = SeccionElectoral::findOrFail($id);
        $seccion->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sección electoral eliminada exitosamente.',
        ]);
    }
}
