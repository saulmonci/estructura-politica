<?php

namespace App\Http\Controllers;

use App\Models\Apoyo;
use App\Models\Promovido;
use App\Models\User;
use Illuminate\Http\Request;

class ApoyoController extends Controller
{
    // ──────────────────────────────────────────────
    // APOYOS DE PROMOVIDOS
    // ──────────────────────────────────────────────

    public function index(Promovido $promovido)
    {
        $apoyos = $promovido->apoyos()->orderBy('fecha', 'desc')->get();
        return response()->json($apoyos);
    }

    public function store(Request $request, Promovido $promovido)
    {
        $validated = $this->validateApoyo($request);

        if ($request->hasFile('evidencia_file')) {
            $validated['evidencia'] = $request->file('evidencia_file')->store('evidencias', 'public');
        }

        $apoyo = $promovido->apoyos()->create($validated);
        return response()->json($apoyo, 201);
    }

    // ──────────────────────────────────────────────
    // APOYOS DE PROMOTORES (Users)
    // ──────────────────────────────────────────────

    public function indexForUser(User $promotor)
    {
        $apoyos = $promotor->apoyos()->orderBy('fecha', 'desc')->get();
        return response()->json($apoyos);
    }

    public function storeForUser(Request $request, User $promotor)
    {
        $validated = $this->validateApoyo($request);

        if ($request->hasFile('evidencia_file')) {
            $validated['evidencia'] = $request->file('evidencia_file')->store('evidencias', 'public');
        }

        $apoyo = $promotor->apoyos()->create($validated);
        return response()->json($apoyo, 201);
    }

    // ──────────────────────────────────────────────
    // ACCIONES COMPARTIDAS (update / delete)
    // ──────────────────────────────────────────────

    public function update(Request $request, Apoyo $apoyo)
    {
        $validated = $this->validateApoyo($request);

        if ($request->hasFile('evidencia_file')) {
            $validated['evidencia'] = $request->file('evidencia_file')->store('evidencias', 'public');
        }

        $apoyo->update($validated);
        return response()->json($apoyo);
    }

    public function destroy(Apoyo $apoyo)
    {
        $apoyo->delete();
        return response()->json(['message' => 'Apoyo eliminado']);
    }

    // ──────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────

    private function validateApoyo(Request $request): array
    {
        return $request->validate([
            'fecha'            => 'required|date',
            'tipo_apoyo'       => 'required|string|max:255',
            'descripcion'      => 'nullable|string',
            'estado'           => 'required|string|in:Pendiente,Entregado,Cancelado',
            'evidencia'        => 'nullable|string',
            'cantidad_monetaria' => 'nullable|numeric|min:0',
        ]);
    }
}
