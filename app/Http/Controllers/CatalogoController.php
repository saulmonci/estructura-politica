<?php

namespace App\Http\Controllers;

use App\Models\State;
use App\Models\Municipality;
use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    /**
     * Get all states.
     */
    public function getEstados()
    {
        $estados = State::orderBy('nombre')->get(['id', 'nombre']);
        return response()->json($estados);
    }

    /**
     * Get municipalities (optionally filtered by state_id).
     */
    public function getMunicipios(Request $request)
    {
        $query = Municipality::query();

        if ($stateId = $request->input('state_id')) {
            $query->where('state_id', $stateId);
        }

        $municipios = $query->orderBy('nombre')->get(['id', 'nombre', 'state_id']);
        return response()->json($municipios);
    }

    /**
     * Get demarcaciones (optionally filtered by municipality_id).
     */
    public function getDemarcaciones(Request $request)
    {
        $query = Demarcacion::query();

        if ($municipalityId = $request->input('municipality_id')) {
            $query->where('municipality_id', $municipalityId);
        }

        $demarcaciones = $query->orderBy('nombre')->get(['id', 'nombre', 'municipality_id']);
        return response()->json($demarcaciones);
    }

    /**
     * Get sections for a given demarcation.
     */
    public function getSecciones($demarcacionId)
    {
        $secciones = SeccionElectoral::where('demarcacion_id', $demarcacionId)
            ->orderBy('numero')
            ->get(['id', 'numero']);
        return response()->json($secciones);
    }
}
