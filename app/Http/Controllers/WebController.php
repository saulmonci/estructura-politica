<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Promovido;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Enums\UserRole;

class WebController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            return redirect()->intended('dashboard');
        }

        return back()->withErrors([
            'email' => 'Las credenciales no coinciden con nuestros registros.',
        ])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();
        
        $rdCount = 0;
        $operadores = 0;
        $promotores = $user->queryPromotores()->count();
        $promovidos = $user->queryPromovidos()->count();
        $totalEstructura = 0;
        
        // Generar puntos de fechas para la gráfica (últimas 5 semanas)
        $dates = [];
        for ($i = 4; $i >= 0; $i--) {
            $date = now()->subDays($i * 7);
            $dates[] = [
                'name' => $date->format('d M'),
                'date' => $date->format('Y-m-d 23:59:59'),
                'rd' => 0,
                'operadores' => 0,
                'promotores' => 0,
                'promovidos' => 0,
            ];
        }

        if (in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $rdCount = User::where('role', UserRole::RD)->count();
            $operadores = User::where('role', UserRole::OPERADOR)->count();
            $promotores = User::where('role', UserRole::PROMOTOR)->count();
            $promovidos = Promovido::count();
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;

            foreach ($dates as &$d) {
                $d['rd'] = User::where('role', UserRole::RD)->where('created_at', '<=', $d['date'])->count();
                $d['operadores'] = User::where('role', UserRole::OPERADOR)->where('created_at', '<=', $d['date'])->count();
                $d['promotores'] = User::where('role', UserRole::PROMOTOR)->where('created_at', '<=', $d['date'])->count();
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])->count();
            }

        } elseif (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $user->getPresidenteId();
            $rdIds = User::where(function ($q) use ($presId) {
                $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
            })->where('role', UserRole::RD)->pluck('id')->toArray();
            $rdCount = count($rdIds);
            
            $opsIds = User::where(function ($q) use ($presId, $rdIds) {
                $q->where('presidente_id', $presId)->orWhereIn('parent_id', !empty($rdIds) ? $rdIds : [0]);
            })->where('role', UserRole::OPERADOR)->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $promotores = $user->queryPromotores()->count();
            $promovidos = $user->queryPromovidos()->count();
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d['rd'] = User::where(function ($q) use ($presId) {
                    $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
                })->where('role', UserRole::RD)->where('created_at', '<=', $d['date'])->count();
                
                $d['operadores'] = User::where(function ($q) use ($presId, $rdIds) {
                    $q->where('presidente_id', $presId)->orWhereIn('parent_id', !empty($rdIds) ? $rdIds : [0]);
                })->where('role', UserRole::OPERADOR)->where('created_at', '<=', $d['date'])->count();
                
                $d['promotores'] = User::where(function ($q) use ($presId) {
                    $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
                })->where('role', UserRole::PROMOTOR)->where('created_at', '<=', $d['date'])->count();
                
                $d['promovidos'] = Promovido::where('presidente_id', $presId)->where('created_at', '<=', $d['date'])->count();
            }
            
        } elseif ($user->role === UserRole::RD) {
            $opsIds = User::where('parent_id', $user->id)->where('role', UserRole::OPERADOR)->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $totalEstructura = $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_opsIds = User::where('parent_id', $user->id)->where('role', UserRole::OPERADOR)->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['operadores'] = count($d_opsIds);
                
                $d_promIds = User::where('role', UserRole::PROMOTOR)
                    ->where('created_at', '<=', $d['date'])
                    ->where(function($q) use ($user, $d_opsIds) {
                        $q->where('parent_id', $user->id)
                          ->orWhereIn('parent_id', $d_opsIds);
                    })
                    ->pluck('id')
                    ->toArray();
                $d['promotores'] = count($d_promIds);
                
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])
                    ->where(function($q) use ($user, $d_opsIds, $d_promIds) {
                        $q->whereIn('promotor_id', $d_promIds)
                          ->orWhere('promotor_id', $user->id)
                          ->orWhereIn('promotor_id', $d_opsIds);
                    })
                    ->count();
            }
            
        } elseif ($user->role === UserRole::OPERADOR) {
            $totalEstructura = $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_promIds = User::where('parent_id', $user->id)->where('role', UserRole::PROMOTOR)->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['promotores'] = count($d_promIds);
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])
                    ->where(function($q) use ($user, $d_promIds) {
                        $q->whereIn('promotor_id', $d_promIds)
                          ->orWhere('promotor_id', $user->id);
                    })
                    ->count();
            }
            
        } elseif ($user->role === UserRole::PROMOTOR) {
            $totalEstructura = $promovidos;
            
            foreach($dates as &$d) {
                $d['promovidos'] = Promovido::where('promotor_id', $user->id)->where('created_at', '<=', $d['date'])->count();
            }
        }

        // Distribución por colonia
        $distribution = [];
        try {
            $distribution = $user->queryPromovidos()
                ->select('colonia', DB::raw('count(*) as total'))
                ->groupBy('colonia')
                ->orderBy('total', 'desc')
                ->get();
        } catch (\Exception $e) {
            \App\Services\ErrorLoggerService::logException($e, request(), ['module' => 'Web Dashboard Distribución']);
        }

        // Para la tabla general de RD
        $rds = [];
        if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $rdsQuery = User::where('role', UserRole::RD)->with('demarcacion');
            if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
                $presId = $user->getPresidenteId();
                $rdsQuery->where(function ($q) use ($presId) {
                    $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
                });
            }
            $rdsList = $rdsQuery->get();
            foreach($rdsList as $rd) {
                $op = User::where('parent_id', $rd->id)->where('role', UserRole::OPERADOR)->count();
                $pr = $rd->queryPromotores()->count();
                $pm = $rd->queryPromovidos()->count();
                
                $rds[] = [
                    'id' => $rd->id,
                    'nombre' => $rd->name,
                    'demarcacion' => $rd->demarcacion?->nombre ?: 'No asignada',
                    'operadores' => $op,
                    'promotores' => $pr,
                    'promovidos' => $pm,
                    'total' => 1 + $op + $pr + $pm,
                ];
            }
        }

        // Lógica de reportes por demarcación (cargada dinámicamente)
        $todasDemarcaciones = \App\Models\Demarcacion::orderBy('id')->get();
        $reporte = [];
        foreach ($todasDemarcaciones as $d) {
            $reporte[$d->id] = [
                'demarcacion' => $d->nombre,
                'rds' => 0,
                'operadores' => 0,
                'promotores' => 0,
                'promovidos' => 0,
            ];
        }

        $presidenteId = $user->getPresidenteId();

        $agrupadosQuery = User::where(function($q) {
            $q->whereNotNull('demarcacion_id')
              ->orWhereNotNull('demarcacion_asignada_id');
        })->whereIn('role', [UserRole::RD, UserRole::OPERADOR, UserRole::PROMOTOR]);

        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $agrupadosQuery->where('presidente_id', $presidenteId);
        }

        $usersList = $agrupadosQuery->get(['role', 'demarcacion_id', 'demarcacion_asignada_id']);
        foreach ($usersList as $u) {
            $demId = $u->role === UserRole::RD ? ($u->demarcacion_asignada_id ?: $u->demarcacion_id) : $u->demarcacion_id;
            if ($demId && isset($reporte[$demId])) {
                if ($u->role === UserRole::RD) $reporte[$demId]['rds']++;
                elseif ($u->role === UserRole::OPERADOR) $reporte[$demId]['operadores']++;
                elseif ($u->role === UserRole::PROMOTOR) $reporte[$demId]['promotores']++;
            }
        }

        $promovidosQuery = DB::table('promovidos')
            ->select('demarcacion_id', DB::raw('COUNT(id) as total_promovidos'))
            ->whereNotNull('demarcacion_id')
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $promovidosQuery->where('presidente_id', $presidenteId);
        }
        $promovidosAgrupados = $promovidosQuery->groupBy('demarcacion_id')->get();

        foreach ($promovidosAgrupados as $prom) {
            $demId = $prom->demarcacion_id;
            if (isset($reporte[$demId])) {
                $reporte[$demId]['promovidos'] = (int)$prom->total_promovidos;
            }
        }

        foreach ($reporte as &$datos) {
            $datos['total'] = $datos['rds'] + $datos['operadores'] + $datos['promotores'] + $datos['promovidos'];
        }

        return Inertia::render('Dashboard', [
            'stats' => [
                'rds' => $rdCount,
                'operadores' => $operadores,
                'promotores' => $promotores,
                'promovidos' => $promovidos,
                'total_estructura' => $totalEstructura,
            ],
            'growthData' => $dates,
            'distribution' => $distribution,
            'rds' => $rds,
            'reporteDemarcaciones' => array_values($reporte)
        ]);
    }

    public function operadores(Request $request)
    {
        $user = $request->user();
        $query = User::where('role', UserRole::OPERADOR);

        if ($user->role === UserRole::RD) {
            $query->where('parent_id', $user->id);
        } else if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $user->getPresidenteId();
            $query->where(function($q) use ($presId) {
                $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
            });
        }

        $operadores = $query->with('leader')->get();

        return Inertia::render('Operadores/Index', [
            'operadores' => $operadores
        ]);
    }

    public function mapa(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            abort(403, 'No autorizado.');
        }

        $canSwitchMunicipality = in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true);
        $municipalityId = null;

        if ($canSwitchMunicipality) {
            if ($request->filled('municipality_id')) {
                $municipalityId = (int) $request->input('municipality_id');
            } elseif ($user->municipality_id) {
                $municipalityId = $user->municipality_id;
            } else {
                $firstWithData = \App\Models\Demarcacion::whereNotNull('municipality_id')->value('municipality_id')
                    ?: \App\Models\SeccionElectoral::whereNotNull('municipality_id')->value('municipality_id');

                if ($firstWithData) {
                    $municipalityId = $firstWithData;
                } else {
                    $firstMuni = \App\Models\Municipality::first();
                    $municipalityId = $firstMuni ? $firstMuni->id : null;
                }
            }
        } else {
            $municipalityId = $user->municipality_id;
            if (!$municipalityId && $user->presidente_id) {
                $pres = \App\Models\User::withoutGlobalScopes()->find($user->presidente_id);
                $municipalityId = $pres?->municipality_id;
            }
            if (!$municipalityId) {
                $presId = $user->getPresidenteId();
                if ($presId) {
                    $pres = \App\Models\User::withoutGlobalScopes()->find($presId);
                    $municipalityId = $pres?->municipality_id;
                }
            }
        }

        $currentMunicipality = $municipalityId ? \App\Models\Municipality::find($municipalityId) : null;

        $muniData = null;
        if ($currentMunicipality) {
            $muniData = [
                'id' => $currentMunicipality->id,
                'nombre' => $currentMunicipality->nombre,
                'lat' => $currentMunicipality->lat ?? 20.8000000,
                'lng' => $currentMunicipality->lng ?? -105.2500000,
                'zoom' => $currentMunicipality->zoom ?? 11,
            ];
        }

        $availableMunicipalities = [];
        if ($canSwitchMunicipality) {
            $availableMunicipalities = \App\Models\Municipality::orderBy('nombre')
                ->get(['id', 'nombre', 'lat', 'lng', 'zoom'])
                ->toArray();
        }

        $presidenteId = in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true) ? $user->getPresidenteId() : null;

        // Obtener demarcaciones filtradas por municipio con meta del presidente si existe
        $demarcacionesQuery = \App\Models\Demarcacion::query();

        if ($presidenteId) {
            $demarcacionesQuery->leftJoin('demarcacion_presidente', function ($join) use ($presidenteId) {
                $join->on('demarcaciones.id', '=', 'demarcacion_presidente.demarcacion_id')
                     ->where('demarcacion_presidente.presidente_id', '=', $presidenteId);
            })
            ->select(
                'demarcaciones.id',
                'demarcaciones.nombre',
                'demarcaciones.municipality_id',
                DB::raw('COALESCE(demarcacion_presidente.meta, demarcaciones.meta, 500) as meta'),
                DB::raw('ST_AsGeoJSON(ST_Transform(demarcaciones.geom, 4326)) as geojson')
            );
        } else {
            $demarcacionesQuery->select(
                'demarcaciones.id',
                'demarcaciones.nombre',
                'demarcaciones.meta',
                'demarcaciones.municipality_id',
                DB::raw('ST_AsGeoJSON(ST_Transform(demarcaciones.geom, 4326)) as geojson')
            );
        }

        if ($municipalityId) {
            $demarcacionesQuery->where('demarcaciones.municipality_id', $municipalityId);
        }

        $demarcaciones = $demarcacionesQuery->orderBy('demarcaciones.id')->get();

        // 1. Contar promovidos por demarcación
        $promovidosQuery = DB::table('promovidos')
            ->select('demarcacion_id', DB::raw('count(*) as total'))
            ->whereNotNull('demarcacion_id')
            ->whereNull('deleted_at');

        if ($municipalityId) {
            $promovidosQuery->where('municipality_id', $municipalityId);
        }
        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $promovidosQuery->where('presidente_id', $presidenteId);
        }
        $promovidosPorDemarcacion = $promovidosQuery->groupBy('demarcacion_id')
            ->pluck('total', 'demarcacion_id')
            ->toArray();

        // 2. Contar usuarios de la estructura (RD, Operador, Promotor) por demarcación
        $usersDemarcacionQuery = DB::table('users')
            ->whereIn('role', [UserRole::RD, UserRole::OPERADOR, UserRole::PROMOTOR])
            ->whereNull('deleted_at');

        if ($municipalityId) {
            $usersDemarcacionQuery->where('municipality_id', $municipalityId);
        }
        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $usersDemarcacionQuery->where('presidente_id', $presidenteId);
        }
        $usersEnDemarcacion = $usersDemarcacionQuery->get(['role', 'demarcacion_id', 'demarcacion_asignada_id']);

        $estructuraPorDemarcacion = [];
        foreach ($usersEnDemarcacion as $u) {
            $targetDem = ($u->role === UserRole::RD || $u->role === 'rd') ? ($u->demarcacion_asignada_id ?: $u->demarcacion_id) : $u->demarcacion_id;
            if ($targetDem) {
                $estructuraPorDemarcacion[$targetDem] = ($estructuraPorDemarcacion[$targetDem] ?? 0) + 1;
            }
        }

        $mapData = [];
        $totalPromovidos = 0;
        $totalMeta = 0;

        foreach ($demarcaciones as $d) {
            $cantPromovidos = ($promovidosPorDemarcacion[$d->id] ?? 0) + ($estructuraPorDemarcacion[$d->id] ?? 0);
            $meta = $d->meta ?? 500;

            $porcentaje = $meta > 0 ? round(($cantPromovidos / $meta) * 100, 1) : 0;

            // Determinar color
            if ($porcentaje < 40) {
                $color = '#EF4444'; // Rojo
            } elseif ($porcentaje <= 60) {
                $color = '#F59E0B'; // Amarillo
            } else {
                $color = '#10B981'; // Verde
            }

            $mapData[] = [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'promovidos' => $cantPromovidos,
                'meta' => $meta,
                'porcentaje' => $porcentaje,
                'color' => $color,
                'geojson' => $d->geojson,
            ];

            $totalPromovidos += $cantPromovidos;
            $totalMeta += $meta;
        }

        $avanceGlobal = $totalMeta > 0 ? round(($totalPromovidos / $totalMeta) * 100, 1) : 0;

        // Obtener secciones electorales filtradas por municipio con meta del presidente si existe
        $seccionesQuery = \App\Models\SeccionElectoral::query();

        if ($presidenteId) {
            $seccionesQuery->leftJoin('seccion_electoral_presidente', function ($join) use ($presidenteId) {
                $join->on('secciones_electorales.id', '=', 'seccion_electoral_presidente.seccion_electoral_id')
                     ->where('seccion_electoral_presidente.presidente_id', '=', $presidenteId);
            })
            ->select(
                'secciones_electorales.id',
                'secciones_electorales.numero',
                'secciones_electorales.demarcacion_id',
                'secciones_electorales.municipality_id',
                DB::raw('COALESCE(seccion_electoral_presidente.meta, secciones_electorales.meta, 50) as meta'),
                DB::raw('ST_AsGeoJSON(ST_Transform(secciones_electorales.geom, 4326)) as geojson')
            );
        } else {
            $seccionesQuery->select(
                'secciones_electorales.id',
                'secciones_electorales.numero',
                'secciones_electorales.meta',
                'secciones_electorales.demarcacion_id',
                'secciones_electorales.municipality_id',
                DB::raw('ST_AsGeoJSON(ST_Transform(secciones_electorales.geom, 4326)) as geojson')
            );
        }

        if ($municipalityId) {
            $seccionesQuery->where('secciones_electorales.municipality_id', $municipalityId);
        }

        $secciones = $seccionesQuery->orderBy('secciones_electorales.numero')->get();

        // 1. Contar promovidos por sección electoral
        $promovidosSeccionQuery = DB::table('promovidos')
            ->select('seccion_electoral', DB::raw('count(*) as total'))
            ->whereNotNull('seccion_electoral')
            ->whereNull('deleted_at');

        if ($municipalityId) {
            $promovidosSeccionQuery->where('municipality_id', $municipalityId);
        }
        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $promovidosSeccionQuery->where('presidente_id', $presidenteId);
        }
        $promovidosPorSeccion = $promovidosSeccionQuery->groupBy('seccion_electoral')
            ->pluck('total', 'seccion_electoral')
            ->toArray();

        // 2. Contar usuarios de la estructura (RD, Operador, Promotor) por sección electoral
        $usersSeccionQuery = DB::table('users')
            ->select('seccion_electoral', DB::raw('count(*) as total'))
            ->whereIn('role', [UserRole::RD, UserRole::OPERADOR, UserRole::PROMOTOR])
            ->whereNotNull('seccion_electoral')
            ->whereNull('deleted_at');

        if ($municipalityId) {
            $usersSeccionQuery->where('municipality_id', $municipalityId);
        }
        if ($presidenteId && !in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            $usersSeccionQuery->where('presidente_id', $presidenteId);
        }
        $estructuraPorSeccion = $usersSeccionQuery->groupBy('seccion_electoral')
            ->pluck('total', 'seccion_electoral')
            ->toArray();

        $seccionesData = [];
        $totalSeccionesMeta = 0;
        $totalSeccionesPromovidos = 0;

        foreach ($secciones as $s) {
            $cantPromovidos = ($promovidosPorSeccion[$s->numero] ?? 0) + ($estructuraPorSeccion[$s->numero] ?? 0);
            $meta = $s->meta ?? 50; // default meta if none set

            $porcentaje = $meta > 0 ? round(($cantPromovidos / $meta) * 100, 1) : 0;

            // Determinar color
            if ($porcentaje < 40) {
                $color = '#EF4444'; // Rojo
            } elseif ($porcentaje <= 60) {
                $color = '#F59E0B'; // Amarillo
            } else {
                $color = '#10B981'; // Verde
            }

            $seccionesData[] = [
                'id' => $s->id,
                'numero' => $s->numero,
                'demarcacion_id' => $s->demarcacion_id,
                'promovidos' => $cantPromovidos,
                'meta' => $meta,
                'porcentaje' => $porcentaje,
                'color' => $color,
                'geojson' => $s->geojson,
            ];

            $totalSeccionesPromovidos += $cantPromovidos;
            $totalSeccionesMeta += $meta;
        }

        // Si no hay demarcaciones pero sí secciones, calcular avance global sobre secciones
        if (count($demarcaciones) === 0 && count($secciones) > 0) {
            $totalPromovidos = $totalSeccionesPromovidos;
            $totalMeta = $totalSeccionesMeta;
            $avanceGlobal = $totalMeta > 0 ? round(($totalPromovidos / $totalMeta) * 100, 1) : 0;
        }

        return Inertia::render('Mapa', [
            'demarcaciones' => $mapData,
            'secciones' => $seccionesData,
            'currentMunicipality' => $muniData,
            'availableMunicipalities' => $availableMunicipalities,
            'canSwitchMunicipality' => $canSwitchMunicipality,
            'globalStats' => [
                'total_promovidos' => $totalPromovidos,
                'total_meta' => $totalMeta,
                'porcentaje' => $avanceGlobal,
            ]
        ]);
    }
}
