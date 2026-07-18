<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class OperadorController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Operadores/Index';
    protected string $dataKey = 'operadores';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, ['presidente', 'rd', "superadmin", "admin"]), 403, 'Acceso denegado.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $user = $request->user();
        if (!$user) {
            return $this->modelClass::query()->where('role', 'operador')->with(['demarcacion', 'leader']);
        }
        return $user->queryOperadores()->with(['demarcacion', 'leader']);
    }

    public function index(Request $request)
    {
        $response = parent::index($request);

        // Si estamos retornando la vista de Inertia, inyectamos los RDs disponibles
        if ($response instanceof \Inertia\Response) {
            $user = $request->user();
            $rds = [];

            if ($user) {
                $role = strtolower($user->role);
                if ($role === 'presidente') {
                    $rds = User::where('role', 'rd')->where('presidente_id', $user->id)->get(['id', 'name', 'apodo', 'demarcacion_id']);
                } elseif (in_array($role, ['admin', 'superadmin', 'superuser'])) {
                    $rds = User::where('role', 'rd')->get(['id', 'name', 'apodo', 'demarcacion_id']);
                }
            }

            $response->with('availableRds', $rds);
        }

        return $response;
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function ($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$searchLower}%"])
                ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$searchLower}%"])
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('telefono', 'like', "%{$search}%")
                ->orWhere('curp', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if ($field === 'name') {
                $valLower = strtolower($value);
                $query->where(function ($q) use ($valLower) {
                    $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"])
                        ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"]);
                });
            } elseif (in_array($field, ['telefono', 'colonia'])) {
                $query->where($field, 'like', "%{$value}%");
            }

            if ($field === 'estado') {
                $query->where('estado', $value);
            }

            if ($field === 'demarcacion_id') {
                $query->where('demarcacion_id', $value);
            }

            if ($field === 'rd_id' || $field === 'parent_id') {
                $query->where('parent_id', $value);
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
            'nombre' => ['required', 'string', 'max:255'],
            'apellidos' => ['required', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:510'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
            'sexo' => ['nullable', 'string', 'max:50'],
            'calle' => ['nullable', 'string', 'max:255'],
            'numero_exterior' => ['nullable', 'string', 'max:50'],
            'numero_interior' => ['nullable', 'string', 'max:50'],
            'colonia' => ['nullable', 'string', 'max:255'],
            'codigo_postal' => ['nullable', 'digits:5'],
            'demarcacion_id' => ['nullable', 'exists:demarcaciones,id'],
            'seccion_electoral' => ['nullable', 'string', 'max:255'],
            'clave_electoral' => ['nullable', 'string', 'size:18', Rule::unique('users', 'clave_electoral')->ignore($id)],
            'telefono' => ['nullable', 'digits:10'],
            'curp' => ['nullable', 'string', 'size:18', Rule::unique('users', 'curp')->ignore($id)],
            'apodo' => ['nullable', 'string', 'max:100'],
            'notas' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:6'],
            'estado' => ['nullable', 'boolean'],
            'foto' => ['nullable', 'image'],
            'ine_frente' => ['nullable', 'image'],
            'ine_reverso' => ['nullable', 'image'],
            'role' => ['nullable', 'string'],
        ];

        if ($user) {
            $role = strtolower($user->role);
            if ($role === 'presidente') {
                $rules['parent_id'] = [
                    'required',
                    Rule::exists('users', 'id')->where('role', 'rd')->where('presidente_id', $user->id)
                ];
            } elseif (in_array($role, ['admin', 'superadmin', 'superuser'])) {
                $rules['parent_id'] = ['required', Rule::exists('users', 'id')->where('role', 'rd')];
            }
        }

        return $rules;
    }

    public function store(Request $request)
    {
        if ($request->has('nombre') && $request->has('apellidos')) {
            $request->merge(['name' => $request->nombre . ' ' . $request->apellidos]);
        }

        if (!$request->filled('email')) {
            $identificador = $request->input('curp') ?: ($request->input('telefono') ?: uniqid());
            $request->merge(['email' => $identificador . '@sistema.local']);
        }

        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->merge(['password' => Hash::make('secret')]);
        }

        $request->merge(['role' => 'operador']);

        return parent::store($request);
    }

    public function update(Request $request, string $id)
    {
        if ($request->has('nombre') && $request->has('apellidos')) {
            $request->merge(['name' => $request->nombre . ' ' . $request->apellidos]);
        }

        if (!$request->filled('email')) {
            $request->request->remove('email');
        }

        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->request->remove('password');
        }

        return parent::update($request, $id);
    }

    protected function handlePhotoUpload(Request $request, $item): void
    {
        $hasChanges = false;

        if ($request->hasFile('foto')) {
            $path = $request->file('foto')->store('fotos', 'public');
            $item->foto = $path;
            $hasChanges = true;
        }

        if ($request->hasFile('ine_frente')) {
            $path = $request->file('ine_frente')->store('fotos', 'public');
            $item->ine_frente = $path;
            $hasChanges = true;
        }

        if ($request->hasFile('ine_reverso')) {
            $path = $request->file('ine_reverso')->store('fotos', 'public');
            $item->ine_reverso = $path;
            $hasChanges = true;
        }

        if ($hasChanges) {
            $item->save();
        }
    }

    protected function afterStore(Request $request, $item): void
    {
        $user = $request->user();

        if ($user) {
            $role = strtolower($user->role);
            if ($role === 'rd') {
                $item->parent_id = $user->id;
            } elseif (in_array($role, ['presidente', 'admin', 'superadmin', 'superuser'])) {
                if ($request->has('parent_id')) {
                    $item->parent_id = $request->input('parent_id');
                }
            }
        }

        $item->save();
        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        parent::afterUpdate($request, $item);
        $this->handlePhotoUpload($request, $item);
    }

    protected function getExportHeaders(): array
    {
        return [
            'ID',
            'Asignado a (RD)',
            'Nombre',
            'Apellidos',
            'Email',
            'Sexo',
            'Calle',
            'No. Exterior',
            'No. Interior',
            'Colonia',
            'Código Postal',
            'Demarcación',
            'Sección Electoral',
            'Clave Electoral',
            'Teléfono',
            'CURP',
            'Apodo',
            'Estatus',
            'Notas',
            'Fecha de Registro'
        ];
    }

    protected function getExportRow($item): array
    {
        $rd = $item->leader;
        return [
            'OP-' . str_pad($item->id, 4, '0', STR_PAD_LEFT),
            $rd ? $rd->name : 'No asignado',
            $item->nombre,
            $item->apellidos,
            $item->email,
            $item->sexo,
            $item->calle,
            $item->numero_exterior,
            $item->numero_interior,
            $item->colonia,
            $item->codigo_postal,
            $item->demarcacion?->nombre,
            $item->seccion_electoral,
            $item->clave_electoral,
            $item->telefono,
            $item->curp,
            $item->apodo,
            $item->estado ? 'Activo' : 'Inactivo',
            $item->notas,
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
