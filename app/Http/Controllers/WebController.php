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
        $promotores = 0;
        $promovidos = 0;
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
            
            if (!empty($rdIds)) {
                $opsIds = User::whereIn('parent_id', $rdIds)->where('role', 'operador')->pluck('id')->toArray();
                $operadores = count($opsIds);
                
                $promIds = User::whereIn('parent_id', $opsIds)->where('role', 'promotor')->pluck('id')->toArray();
                $promotores = count($promIds);
                
                $promovidos = Promovido::whereIn('promotor_id', $promIds)->count();
                
                foreach($dates as &$d) {
                    $d['rd'] = User::where('parent_id', $user->id)->where('role', 'rd')->where('created_at', '<=', $d['date'])->count();
                    
                    $d_opsIds = User::whereIn('parent_id', $rdIds)->where('role', 'operador')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                    $d['operadores'] = count($d_opsIds);
                    
                    $d_promIds = User::whereIn('parent_id', $d_opsIds)->where('role', 'promotor')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                    $d['promotores'] = count($d_promIds);
                    
                    $d['promovidos'] = Promovido::whereIn('promotor_id', $d_promIds)->where('created_at', '<=', $d['date'])->count();
                }
            }
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;
            
        } elseif ($user->role === 'rd') {
            $opsIds = User::where('parent_id', $user->id)->where('role', 'operador')->pluck('id')->toArray();
            $operadores = count($opsIds);
            
            $promIds = User::whereIn('parent_id', $opsIds)->where('role', 'promotor')->pluck('id')->toArray();
            $promotores = count($promIds);
            
            $promovidos = Promovido::whereIn('promotor_id', $promIds)->count();
            
            $totalEstructura = $operadores + $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_opsIds = User::where('parent_id', $user->id)->where('role', 'operador')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['operadores'] = count($d_opsIds);
                
                $d_promIds = User::whereIn('parent_id', $d_opsIds)->where('role', 'promotor')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['promotores'] = count($d_promIds);
                
                $d['promovidos'] = Promovido::whereIn('promotor_id', $d_promIds)->where('created_at', '<=', $d['date'])->count();
            }
            
        } elseif ($user->role === 'operador') {
            $promIds = User::where('parent_id', $user->id)->where('role', 'promotor')->pluck('id')->toArray();
            $promotores = count($promIds);
            $promovidos = Promovido::whereIn('promotor_id', $promIds)->count();
            $totalEstructura = $promotores + $promovidos;
            
            foreach($dates as &$d) {
                $d_promIds = User::where('parent_id', $user->id)->where('role', 'promotor')->where('created_at', '<=', $d['date'])->pluck('id')->toArray();
                $d['promotores'] = count($d_promIds);
                $d['promovidos'] = Promovido::whereIn('promotor_id', $d_promIds)->where('created_at', '<=', $d['date'])->count();
            }
            
        } elseif ($user->role === 'promotor') {
            $promovidos = Promovido::where('promotor_id', $user->id)->count();
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
                $opIds = User::where('parent_id', $rd->id)->where('role', 'operador')->pluck('id')->toArray();
                $op = count($opIds);
                
                $prIds = User::whereIn('parent_id', $opIds)->where('role', 'promotor')->pluck('id')->toArray();
                $pr = count($prIds);
                
                $pm = Promovido::whereIn('promotor_id', $prIds)->count();
                
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
            'rds' => $rds
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
