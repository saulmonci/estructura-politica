<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Promovido;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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

        if (in_array($user->role, ['superuser', 'admin'])) {
            $rdCount = User::where('role', 'rd')->count();
            $operadores = User::where('role', 'operador')->count();
            $promotores = User::where('role', 'promotor')->count();
            $promovidos = Promovido::count();
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;

            foreach ($dates as &$d) {
                $d['rd'] = User::where('role', 'rd')->where('created_at', '<=', $d['date'])->count();
                $d['operadores'] = User::where('role', 'operador')->where('created_at', '<=', $d['date'])->count();
                $d['promotores'] = User::where('role', 'promotor')->where('created_at', '<=', $d['date'])->count();
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])->count();
            }

        } elseif ($user->role === 'presidente') {
            $rdIds = User::where('presidente_id', $user->id)->where('role', 'rd')->pluck('id')->toArray();
            $rdCount = count($rdIds);
            
            $opsIds = User::where('presidente_id', $user->id)->where('role', 'operador')->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d['rd'] = User::where('presidente_id', $user->id)->where('role', 'rd')->where('created_at', '<=', $d['date'])->count();
                
                $d['operadores'] = User::where('presidente_id', $user->id)->where('role', 'operador')->where('created_at', '<=', $d['date'])->count();
                
                $d['promotores'] = User::where('presidente_id', $user->id)->where('role', 'promotor')->where('created_at', '<=', $d['date'])->count();
                
                $d['promovidos'] = Promovido::where('presidente_id', $user->id)->where('created_at', '<=', $d['date'])->count();
            }
            
        } elseif ($user->role === 'rd') {
            $opsIds = User::where('parent_id', $user->id)->where('role', 'operador')->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $totalEstructura = $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_opsIds = User::where('parent_id', $user->id)->where('role', 'operador')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['operadores'] = count($d_opsIds);
                
                $d_promIds = User::where('role', 'promotor')
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
            
        } elseif ($user->role === 'operador') {
            $totalEstructura = $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_promIds = User::where('parent_id', $user->id)->where('role', 'promotor')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['promotores'] = count($d_promIds);
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])
                    ->where(function($q) use ($user, $d_promIds) {
                        $q->whereIn('promotor_id', $d_promIds)
                          ->orWhere('promotor_id', $user->id);
                    })
                    ->count();
            }
            
        } elseif ($user->role === 'promotor') {
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
        } catch (\Exception $e) {}

        // Para la tabla general de RD
        $rds = [];
        if (in_array($user->role, ['presidente', 'superuser', 'admin'])) {
            $rdsQuery = User::where('role', 'rd')->with('demarcacion');
            if ($user->role === 'presidente') {
                $rdsQuery->where('presidente_id', $user->id);
            }
            $rdsList = $rdsQuery->get();
            foreach($rdsList as $rd) {
                $op = User::where('parent_id', $rd->id)->where('role', 'operador')->count();
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
        })->whereIn('role', ['rd', 'operador', 'promotor']);

        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
            $agrupadosQuery->where('presidente_id', $presidenteId);
        }

        $usersList = $agrupadosQuery->get(['role', 'demarcacion_id', 'demarcacion_asignada_id']);
        foreach ($usersList as $u) {
            $demId = $u->role === 'rd' ? ($u->demarcacion_asignada_id ?: $u->demarcacion_id) : $u->demarcacion_id;
            if ($demId && isset($reporte[$demId])) {
                if ($u->role === 'rd') $reporte[$demId]['rds']++;
                elseif ($u->role === 'operador') $reporte[$demId]['operadores']++;
                elseif ($u->role === 'promotor') $reporte[$demId]['promotores']++;
            }
        }

        $promovidosQuery = DB::table('promovidos')
            ->select('demarcacion_id', DB::raw('COUNT(id) as total_promovidos'))
            ->whereNotNull('demarcacion_id')
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
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
        $query = User::where('role', 'operador');

        if ($user->role === 'rd') {
            $query->where('parent_id', $user->id);
        } else if ($user->role === 'presidente') {
            $query->where('presidente_id', $user->id);
        }

        $operadores = $query->with('leader')->get();

        return Inertia::render('Operadores/Index', [
            'operadores' => $operadores
        ]);
    }

    public function mapa(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['presidente', 'admin', 'superuser'])) {
            abort(403, 'No autorizado.');
        }

        $presidenteId = $user->role === 'presidente' ? $user->id : $user->getPresidenteId();

        // Obtener todas las demarcaciones con sus metas y polígonos
        $demarcaciones = \App\Models\Demarcacion::select(
            'id',
            'nombre',
            'meta',
            DB::raw('ST_AsGeoJSON(ST_Transform(geom, 4326)) as geojson')
        )->orderBy('id')->get();

        // 1. Contar promovidos por demarcación
        $promovidosQuery = DB::table('promovidos')
            ->select('demarcacion_id', DB::raw('count(*) as total'))
            ->whereNotNull('demarcacion_id')
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
            $promovidosQuery->where('presidente_id', $presidenteId);
        }
        $promovidosPorDemarcacion = $promovidosQuery->groupBy('demarcacion_id')
            ->pluck('total', 'demarcacion_id')
            ->toArray();

        // 2. Contar usuarios de la estructura (RD, Operador, Promotor) por demarcación
        $usersDemarcacionQuery = DB::table('users')
            ->whereIn('role', ['rd', 'operador', 'promotor'])
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
            $usersDemarcacionQuery->where('presidente_id', $presidenteId);
        }
        $usersEnDemarcacion = $usersDemarcacionQuery->get(['role', 'demarcacion_id', 'demarcacion_asignada_id']);

        $estructuraPorDemarcacion = [];
        foreach ($usersEnDemarcacion as $u) {
            $targetDem = $u->role === 'rd' ? ($u->demarcacion_asignada_id ?: $u->demarcacion_id) : $u->demarcacion_id;
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

        // Obtener todas las secciones con sus metas, demarcación asignada y polígonos
        $secciones = \App\Models\SeccionElectoral::select(
            'id',
            'numero',
            'meta',
            'demarcacion_id',
            DB::raw('ST_AsGeoJSON(ST_Transform(geom, 4326)) as geojson')
        )->orderBy('numero')->get();

        // 1. Contar promovidos por sección electoral
        $promovidosSeccionQuery = DB::table('promovidos')
            ->select('seccion_electoral', DB::raw('count(*) as total'))
            ->whereNotNull('seccion_electoral')
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
            $promovidosSeccionQuery->where('presidente_id', $presidenteId);
        }
        $promovidosPorSeccion = $promovidosSeccionQuery->groupBy('seccion_electoral')
            ->pluck('total', 'seccion_electoral')
            ->toArray();

        // 2. Contar usuarios de la estructura (RD, Operador, Promotor) por sección electoral
        $usersSeccionQuery = DB::table('users')
            ->select('seccion_electoral', DB::raw('count(*) as total'))
            ->whereIn('role', ['rd', 'operador', 'promotor'])
            ->whereNotNull('seccion_electoral')
            ->whereNull('deleted_at');
        if ($presidenteId && !in_array($user->role, ['superuser', 'admin'])) {
            $usersSeccionQuery->where('presidente_id', $presidenteId);
        }
        $estructuraPorSeccion = $usersSeccionQuery->groupBy('seccion_electoral')
            ->pluck('total', 'seccion_electoral')
            ->toArray();

        $seccionesData = [];
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
        }

        return Inertia::render('Mapa', [
            'demarcaciones' => $mapData,
            'secciones' => $seccionesData,
            'globalStats' => [
                'total_promovidos' => $totalPromovidos,
                'total_meta' => $totalMeta,
                'porcentaje' => $avanceGlobal,
            ]
        ]);
    }
}
