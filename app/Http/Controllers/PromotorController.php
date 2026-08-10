<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class PromotorController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Promotores/Index';
    protected string $dataKey = 'promotores';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::RD, UserRole::OPERADOR, UserRole::SUPERUSER, UserRole::ADMIN], true), 403, 'Acceso denegado.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $user = $request->user();
        if (!$user) {
            return $this->modelClass::query()->where('role', UserRole::PROMOTOR)->with(['demarcacion', 'leader']);
        }
        return $user->queryPromotores()->with(['demarcacion', 'leader']);
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
                if (in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
                    $operadores = User::where('role', UserRole::OPERADOR)->get(['id', 'name', 'apodo', 'demarcacion_id']);
                    $rds = User::where('role', UserRole::RD)->get(['id', 'name', 'demarcacion_id']);
                } elseif (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
                    $operadores = User::where('role', UserRole::OPERADOR)->where('presidente_id', $user->getPresidenteId())->get(['id', 'name', 'apodo', 'demarcacion_id']);
                    $rds = User::where('role', UserRole::RD)->where('presidente_id', $user->getPresidenteId())->get(['id', 'name', 'demarcacion_id']);
                } elseif ($user->role === UserRole::RD) {
                    $operadores = User::where('role', UserRole::OPERADOR)->where('parent_id', $user->id)->get(['id', 'name', 'apodo', 'demarcacion_id']);
                }
            }

            $response->with('availableOperadores', $operadores);
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
        $name = $filters['name'] ?? $filters['nombre'] ?? null;
        if ($name !== null && $name !== '') {
            $valLower = strtolower($name);
            $query->where(function ($q) use ($valLower) {
                $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"])
                    ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"]);
            });
        }

        if (isset($filters['telefono']) && $filters['telefono'] !== '') {
            $query->where('telefono', 'like', "%{$filters['telefono']}%");
        }

        if (isset($filters['colonia']) && $filters['colonia'] !== '') {
            $query->where('colonia', 'like', "%{$filters['colonia']}%");
        }

        if (isset($filters['estado']) && $filters['estado'] !== '') {
            $query->where('estado', $filters['estado']);
        }

        if (isset($filters['demarcacion_id']) && $filters['demarcacion_id'] !== '') {
            $query->where('demarcacion_id', $filters['demarcacion_id']);
        }

        $parentId = $filters['operador_id'] ?? $filters['parent_id'] ?? null;
        if ($parentId !== null && $parentId !== '') {
            $query->where('parent_id', $parentId);
        }

        if (isset($filters['created_at']) && is_array($filters['created_at']) && count($filters['created_at']) === 2) {
            $query->whereBetween('created_at', [$filters['created_at'][0] . ' 00:00:00', $filters['created_at'][1] . ' 23:59:59']);
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
            if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
                $rules['parent_id'] = [
                    'required',
                    Rule::exists('users', 'id')->where('role', UserRole::OPERADOR->value)->where('presidente_id', $user->getPresidenteId())
                ];
            } elseif ($user->role === UserRole::RD) {
                $rules['parent_id'] = [
                    'required',
                    Rule::exists('users', 'id')->where('parent_id', $user->id)->where('role', UserRole::OPERADOR->value)
                ];
            } elseif (in_array($user->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
                $rules['parent_id'] = [
                    'required',
                    Rule::exists('users', 'id')->where('role', UserRole::OPERADOR->value)
                ];
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

        $request->merge(['role' => UserRole::PROMOTOR->value]);

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

        if ($user && $user->role === UserRole::OPERADOR) {
            $item->parent_id = $user->id;
        } elseif ($user && in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::RD, UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            if ($request->has('parent_id')) {
                $item->parent_id = $request->input('parent_id');
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
            'Asignado a (Operador)',
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
        $operador = $item->leader;
        return [
            'PR-' . str_pad($item->id, 4, '0', STR_PAD_LEFT),
            $operador ? $operador->name : 'No asignado',
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
