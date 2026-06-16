<?php

namespace App\Http\Controllers;

use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Http\Request;

class CatalogoController extends Controller
{
    /**
     * Get all demarcaciones.
     */
    public function getDemarcaciones()
    {
        $demarcaciones = Demarcacion::orderBy('id')->get(['id', 'nombre']);
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
