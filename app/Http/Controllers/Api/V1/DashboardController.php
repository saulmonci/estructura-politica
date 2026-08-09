<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Demarcacion;
use App\Models\User;
use App\Models\Promovido;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Enums\UserRole;

class DashboardController extends Controller
{
    /**
     * Iniciar sesión y emitir token de Sanctum.
     * 
     * POST /v1/auth/login
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = $request->only('email', 'password');
        $isEmail = filter_var($credentials['email'], FILTER_VALIDATE_EMAIL);

        $user = null;
        if ($isEmail) {
            $user = User::where('email', $credentials['email'])->first();
        } else {
            $user = User::where('telefono', $credentials['email'])
                ->orWhere('curp', $credentials['email'])
                ->first();
        }

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas.'
            ], 401);
        }

        // Revocar tokens anteriores
        $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        // Cargar el municipio para devolverlo en el login (útil para la app móvil)
        $user->load('municipality');
        //necesito obtener la demarcacion que pertenece el usuario
        $demarcacion = Demarcacion::where('municipality_id', $user->municipality_id)->first();
        $user->demarcacion = $demarcacion;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role instanceof UserRole ? $user->role->value : $user->role,
                    'municipality_id' => $user->municipality_id,
                    'municipality' => $user->municipality,
                    'demarcacion' => $user->demarcacion,
                ]
            ]
        ], 200);
    }

    /**
     * Obtener el perfil del usuario autenticado.
     * Si tiene un parent_id, incluye los datos de su líder inmediato.
     * 
     * GET /v1/dashboard/profile
     */
    public function getProfile(Request $request)
    {
        $user = $request->user();

        if ($user->parent_id) {
            $user->load('leader');
        }

        return response()->json([
            'success' => true,
            'data' => $user
        ], 200);
    }

    /**
     * Obtener estadísticas jerárquicas según el rol.
     * 
     * GET /v1/dashboard/stats
     */
    public function getStats(Request $request)
    {
        $user = $request->user();

        $operadores = 0;
        $promotores = $user->queryPromotores()->count();
        $promovidos = $user->queryPromovidos()->count();
        $totalEstructura = 0;

        if ($user->role === UserRole::PRESIDENTE) {
            // RDs del Presidente
            $rdIds = User::where('parent_id', $user->id)->where('role', UserRole::RD)->pluck('id')->toArray();
            $rdCount = count($rdIds);

            $operadores = User::whereIn('parent_id', $rdIds)->where('role', UserRole::OPERADOR)->count();

            // Total estructura: RDs + Operadores + Promotores + Promovidos
            $totalEstructura = $rdCount + $operadores + $promotores + $promovidos;
        } elseif ($user->role === UserRole::RD) {
            // Operadores
            $operadores = User::where('parent_id', $user->id)->where('role', UserRole::OPERADOR)->count();

            // Total estructura: Operadores + Promotores + Promovidos
            $totalEstructura = $operadores + $promotores + $promovidos;
        } elseif ($user->role === UserRole::OPERADOR) {
            // Total estructura: Promotores + Promovidos
            $totalEstructura = $promotores + $promovidos;
        } elseif ($user->role === UserRole::PROMOTOR) {
            $totalEstructura = $promovidos;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'operadores' => $operadores,
                'promotores' => $promotores,
                'promovidos' => $promovidos,
                'total_estructura' => $totalEstructura,
            ]
        ], 200);
    }

    /**
     * Agrupa y cuenta los promovidos bajo el alcance del usuario según su rol,
     * ordenados de mayor a menor por el campo 'colonia'.
     * 
     * GET /v1/dashboard/colonia-distribution
     */
    public function getColoniaDistribution(Request $request)
    {
        try {
            $user = $request->user();

            $distribution = $user->queryPromovidos()
                ->select('colonia', DB::raw('count(*) as total'))
                ->groupBy('colonia')
                ->orderBy('total', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $distribution
            ], 200);
        } catch (\Exception $e) {
            // TODO(security): Log detailed error server-side, but keep public error generic.
            return response()->json([
                'success' => false,
                'message' => 'Ocurrió un error al obtener la distribución de colonias.'
            ], 500);
        }
    }

    /**
     * Listado paginado optimizado para el componente <ProTable /> de Ant Design Pro.
     * 
     * GET /v1/dashboard/promovidos-table
     */
    public function getPromovidosTable(Request $request)
    {
        try {
            $user = $request->user();

            // Iniciar query base según la jerarquía
            $query = $user->queryPromovidos();

            // Filtros opcionales de búsqueda
            if ($request->filled('nombre_completo')) {
                // Previene SQL injection por medio de queries parametrizadas automáticas de Eloquent
                $query->where('nombre_completo', 'like', '%' . $request->input('nombre_completo') . '%');
            }

            if ($request->filled('clave_elector')) {
                $query->where('clave_elector', $request->input('clave_elector'));
            }

            if ($request->filled('seccion_electoral')) {
                $query->where('seccion_electoral', $request->input('seccion_electoral'));
            }

            // Paginación de ProTable
            $pageSize = (int) $request->input('pageSize', 10);
            $current = (int) $request->input('current', 1);

            // Asegurar límites razonables para evitar ataques DoS por sobrecarga de memoria
            if ($pageSize < 1 || $pageSize > 100) {
                $pageSize = 10;
            }
            if ($current < 1) {
                $current = 1;
            }

            // Obtener conteo total filtrado antes de paginar
            $total = $query->count();

            // Obtener registros paginados
            $data = $query->skip(($current - 1) * $pageSize)
                ->take($pageSize)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $data,
                'total' => $total
            ], 200);
        } catch (\Exception $e) {
            // TODO(security): Log execution exceptions and return generic message
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar el listado de promovidos.'
            ], 500);
        }
    }
}
