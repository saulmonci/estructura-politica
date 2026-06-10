<?php

namespace App\Http\Controllers;

use App\Models\Apoyo;
use App\Models\Promovido;
use Illuminate\Http\Request;

class ApoyoController extends Controller
{
    public function index(Promovido $promovido)
    {
        $apoyos = $promovido->apoyos()->orderBy('fecha', 'desc')->get();
        return response()->json($apoyos);
    }

    public function store(Request $request, Promovido $promovido)
    {
        $validated = $request->validate([
            'fecha' => 'required|date',
            'tipo_apoyo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'estado' => 'required|string|in:Pendiente,Entregado,Cancelado',
            'evidencia' => 'nullable|string',
            'cantidad_monetaria' => 'nullable|numeric|min:0',
        ]);

        // Si viene un archivo en 'evidencia', guardarlo (opcional, si enviamos file en el futuro)
        if ($request->hasFile('evidencia_file')) {
            $path = $request->file('evidencia_file')->store('evidencias', 'public');
            $validated['evidencia'] = $path;
        }

        $apoyo = $promovido->apoyos()->create($validated);

        return response()->json($apoyo, 201);
    }

    public function update(Request $request, Apoyo $apoyo)
    {
        $validated = $request->validate([
            'fecha' => 'required|date',
            'tipo_apoyo' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'estado' => 'required|string|in:Pendiente,Entregado,Cancelado',
            'evidencia' => 'nullable|string',
            'cantidad_monetaria' => 'nullable|numeric|min:0',
        ]);

        if ($request->hasFile('evidencia_file')) {
            $path = $request->file('evidencia_file')->store('evidencias', 'public');
            $validated['evidencia'] = $path;
        }

        $apoyo->update($validated);

        return response()->json($apoyo);
    }

    public function destroy(Apoyo $apoyo)
    {
        $apoyo->delete();
        return response()->json(['message' => 'Apoyo eliminado']);
    }
}
