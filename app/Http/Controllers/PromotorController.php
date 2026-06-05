<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class PromotorController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Promotores/Index';
    protected string $dataKey = 'promotores';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, ['presidente', 'rd', 'operador']), 403, 'Acceso denegado.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $query = $this->modelClass::query()->where('role', 'promotor');
        
        $user = $request->user();
        if ($user) {
            $role = strtolower($user->role);
            if ($role === 'operador') {
                $query->where('parent_id', $user->id);
            } elseif ($role === 'rd') {
                // El RD ve los promotores de sus operadores
                $operadoresIds = User::where('role', 'operador')->where('parent_id', $user->id)->pluck('id');
                // IMPORTANTE: Si un RD no tiene operadores, no debe ver ningún promotor.
                if ($operadoresIds->isEmpty()) {
                    $query->whereRaw('1 = 0');
                } else {
                    $query->whereIn('parent_id', $operadoresIds);
                }
            } elseif ($role === 'presidente') {
                // El Presidente ve todos los promotores (opcionalmente de ciertos operadores/RDs si se filtra)
                // Si no hay filtro, ve todos.
            }
        }

        return $query;
    }

    public function index(Request $request)
    {
        $response = parent::index($request);

        // Si estamos retornando la vista de Inertia, inyectamos los Operadores disponibles
        if ($response instanceof \Inertia\Response) {
            $user = $request->user();
            $operadores = [];
            $rds = [];
            
            if ($user) {
                $role = strtolower($user->role);
                if ($role === 'presidente') {
                    $operadores = User::where('role', 'operador')->get(['id', 'name', 'apodo']);
                    $rds = User::where('role', 'rd')->get(['id', 'name']);
                } elseif ($role === 'rd') {
                    $operadores = User::where('role', 'operador')->where('parent_id', $user->id)->get(['id', 'name', 'apodo']);
                }
            }
            
            $response->with('availableOperadores', $operadores);
            $response->with('availableRds', $rds);
        }

        return $response;
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('telefono', 'like', "%{$search}%")
              ->orWhere('curp', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if (in_array($field, ['name', 'telefono', 'colonia'])) {
                $query->where($field, 'like', "%{$value}%");
            }

            if ($field === 'estado') {
                $query->where('estado', $value);
            }
            
            if ($field === 'rd_id') {
                $opsIds = User::where('role', 'operador')->where('parent_id', $value)->pluck('id');
                $query->whereIn('parent_id', $opsIds);
            }

            if ($field === 'created_at' && is_array($value) && count($value) === 2) {
                $query->whereBetween('created_at', [$value[0] . ' 00:00:00', $value[1] . ' 23:59:59']);
            }
        }
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        $user = $request->user();
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            'sexo' => ['nullable', 'string', 'max:50'],
            'calle' => ['nullable', 'string', 'max:255'],
            'numero_exterior' => ['nullable', 'string', 'max:50'],
            'numero_interior' => ['nullable', 'string', 'max:50'],
            'colonia' => ['nullable', 'string', 'max:255'],
            'demarcacion' => ['nullable', 'string', 'max:255'],
            'clave_electoral' => ['nullable', 'string', 'max:50'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'curp' => ['nullable', 'string', 'max:50'],
            'apodo' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string', 'min:6'],
            'estado' => ['nullable', 'boolean'],
        ];

        if ($user) {
            $role = strtolower($user->role);
            if ($role === 'presidente') {
                $rules['parent_id'] = ['required', 'exists:users,id'];
            } elseif ($role === 'rd') {
                $rules['parent_id'] = [
                    'required', 
                    Rule::exists('users', 'id')->where('parent_id', $user->id)->where('role', 'operador')
                ];
            }
        }

        return $rules;
    }
    
    public function store(Request $request)
    {
        if (!$request->has('email')) {
            $identificador = $request->input('curp') ?: ($request->input('telefono') ?: uniqid());
            $request->merge(['email' => $identificador . '@sistema.local']);
        }
        
        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->merge(['password' => Hash::make('secret')]);
        }

        return parent::store($request);
    }

    public function update(Request $request, string $id)
    {
        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->request->remove('password');
        }

        return parent::update($request, $id);
    }

    protected function afterStore(Request $request, $item): void
    {
        $user = $request->user();
        
        if ($user && strtolower($user->role) === 'operador') {
            $item->parent_id = $user->id;
        } elseif ($user && in_array(strtolower($user->role), ['presidente', 'rd'])) {
            if ($request->has('parent_id')) {
                $item->parent_id = $request->input('parent_id');
            }
        }
        
        $item->role = 'promotor';
        $item->save();
    }
}
