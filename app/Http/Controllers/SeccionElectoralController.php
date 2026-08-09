<?php

namespace App\Http\Controllers;

use App\Models\SeccionElectoral;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class SeccionElectoralController extends Controller
{
    /**
     * Enforce role validation.
     */
    protected function checkAccess(Request $request): void
    {
        abort_if(
            !$request->user() || !in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::ADMIN, UserRole::SUPERUSER], true),
            403,
            'Acceso denegado. Solo el Presidente puede administrar las secciones electorales.'
        );
    }

    /**
     * List all sections for a specific demarcation.
     */
    public function index(Request $request, $demarcacionId)
    {
        $this->checkAccess($request);

        $secciones = SeccionElectoral::where('demarcacion_id', $demarcacionId)
            ->orderBy('numero')
            ->get();

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
                'unique:secciones_electorales,numero'
            ],
            'meta' => ['required', 'integer', 'min:0'],
        ], [
            'numero.unique' => 'El número de sección electoral ya está registrado en el sistema.'
        ]);

        $seccion = SeccionElectoral::create([
            'numero' => $validated['numero'],
            'meta' => $validated['meta'],
            'demarcacion_id' => $demarcacionId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sección electoral agregada exitosamente.',
            'data' => $seccion
        ]);
    }

    /**
     * Update an existing section.
     */
    public function update(Request $request, $id)
    {
        $this->checkAccess($request);

        $seccion = SeccionElectoral::findOrFail($id);

        $validated = $request->validate([
            'numero' => [
                'required',
                'string',
                'max:255',
                Rule::unique('secciones_electorales', 'numero')->ignore($id)
            ],
            'meta' => ['required', 'integer', 'min:0'],
        ], [
            'numero.unique' => 'El número de sección electoral ya está registrado en el sistema.'
        ]);

        $seccion->update([
            'numero' => $validated['numero'],
            'meta' => $validated['meta'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sección electoral actualizada exitosamente.',
            'data' => $seccion
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
            'message' => 'Sección electoral eliminada exitosamente.'
        ]);
    }
}
