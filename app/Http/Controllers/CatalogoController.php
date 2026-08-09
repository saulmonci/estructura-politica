<?php

namespace App\Http\Controllers;

use App\Models\State;
use App\Models\Municipality;
use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Http\Request;
use App\Enums\UserRole;

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

    public function getDemarcaciones(Request $request)
    {
        $query = Demarcacion::query();

        $user = $request->user();

        // Aplicar filtro territorial del usuario
        if ($user && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            if ($user->scope_level === 'estatal' && $user->state_id) {
                // Filtrar demarcaciones por el estado del usuario
                $query->whereHas('municipality', function($q) use ($user) {
                    $q->where('state_id', $user->state_id);
                });
            } elseif ($user->scope_level === 'municipal' && $user->municipality_id) {
                // Filtrar demarcaciones por el municipio del usuario
                $query->where('municipality_id', $user->municipality_id);
            } elseif ($user->scope_level === 'demarcacion' && $user->demarcacion_id) {
                // Filtrar para que solo vea su propia demarcación
                $query->where('id', $user->demarcacion_id);
            }
        }
        
        // Si el admin estatal está solicitando, también lo filtramos por default
        if ($user && $user->role === UserRole::ADMIN && $user->scope_level === 'estatal' && $user->state_id) {
            $query->whereHas('municipality', function($q) use ($user) {
                $q->where('state_id', $user->state_id);
            });
        }
        if ($user && $user->role === UserRole::ADMIN && $user->scope_level === 'municipal' && $user->municipality_id) {
            $query->where('municipality_id', $user->municipality_id);
        }

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
