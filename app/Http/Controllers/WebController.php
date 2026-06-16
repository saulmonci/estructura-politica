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

        if ($user->role === 'presidente') {
            $rdIds = User::where('parent_id', $user->id)->where('role', 'rd')->pluck('id')->toArray();
            $rdCount = count($rdIds);
            
            $opsIds = User::whereIn('parent_id', $rdIds)->where('role', 'operador')->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d['rd'] = User::where('parent_id', $user->id)->where('role', 'rd')->where('created_at', '<=', $d['date'])->count();
                
                $d_opsIds = User::whereIn('parent_id', $rdIds)->where('role', 'operador')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['operadores'] = count($d_opsIds);
                
                $d['promotores'] = User::where('role', 'promotor')->where('created_at', '<=', $d['date'])->count();
                
                $d['promovidos'] = Promovido::where('created_at', '<=', $d['date'])->count();
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
        if ($user->role === 'presidente') {
            $rdsList = User::where('parent_id', $user->id)->where('role', 'rd')->get();
            foreach($rdsList as $rd) {
                $op = User::where('parent_id', $rd->id)->where('role', 'operador')->count();
                $pr = $rd->queryPromotores()->count();
                $pm = $rd->queryPromovidos()->count();
                
                $rds[] = [
                    'id' => $rd->id,
                    'nombre' => $rd->name,
                    'demarcacion' => $rd->demarcacion ?: 'No asignada',
                    'operadores' => $op,
                    'promotores' => $pr,
                    'promovidos' => $pm,
                    'total' => 1 + $op + $pr + $pm,
                ];
            }
        }

        // Lógica de reportes por demarcación
        $agrupados = User::whereNotNull('demarcacion')
            ->select('demarcacion')
            ->selectRaw("SUM(CASE WHEN role = 'rd' THEN 1 ELSE 0 END) as total_rds")
            ->selectRaw("SUM(CASE WHEN role = 'operador' THEN 1 ELSE 0 END) as total_operadores")
            ->selectRaw("SUM(CASE WHEN role = 'promotor' THEN 1 ELSE 0 END) as total_promotores")
            ->groupBy('demarcacion')
            ->get()
            ->keyBy('demarcacion')
            ->toArray();

        $promovidosAgrupados = DB::table('promovidos')
            ->join('users', 'promovidos.promotor_id', '=', 'users.id')
            ->select('users.demarcacion')
            ->selectRaw('COUNT(promovidos.id) as total_promovidos')
            ->whereNotNull('users.demarcacion')
            ->groupBy('users.demarcacion')
            ->get();

        $reporte = [];
        foreach ($agrupados as $dem => $datos) {
            $reporte[$dem] = [
                'demarcacion' => "Demarcación " . $dem,
                'rds' => (int)$datos['total_rds'],
                'operadores' => (int)$datos['total_operadores'],
                'promotores' => (int)$datos['total_promotores'],
                'promovidos' => 0,
            ];
        }
        foreach ($promovidosAgrupados as $prom) {
            $dem = $prom->demarcacion;
            if (!isset($reporte[$dem])) {
                $reporte[$dem] = [
                    'demarcacion' => "Demarcación " . $dem,
                    'rds' => 0,
                    'operadores' => 0,
                    'promotores' => 0,
                    'promovidos' => 0,
                ];
            }
            $reporte[$dem]['promovidos'] = (int)$prom->total_promovidos;
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
            $rdIds = User::where('parent_id', $user->id)->where('role', 'rd')->pluck('id')->toArray();
            $query->whereIn('parent_id', $rdIds);
        }

        $operadores = $query->with('leader')->get();

        return Inertia::render('Operadores/Index', [
            'operadores' => $operadores
        ]);
    }

}
