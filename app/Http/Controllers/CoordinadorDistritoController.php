<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class CoordinadorDistritoController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Coordinadores/Index';
    protected string $dataKey = 'coordinadores';

    protected function checkAccess(Request $request): void
    {
        abort_if(
            !$request->user() || !in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::ADMIN, UserRole::SUPERUSER, UserRole::COORDINADOR_DISTRITO], true),
            403,
            'Acceso denegado. Solo los administradores y presidentes pueden gestionar coordinadores de distrito.'
        );
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $user = $request->user();
        $query = User::query()->where('role', UserRole::COORDINADOR_DISTRITO)
            ->with(['presidente:id,name,apodo', 'state:id,nombre', 'municipality:id,nombre']);

        if ($user) {
            if ($user->role === UserRole::PRESIDENTE) {
                $query->where(function ($q) use ($user) {
                    $q->where('presidente_id', $user->id)
                      ->orWhere('parent_id', $user->id);
                });
            } elseif ($user->role === UserRole::COORDINADOR_DISTRITO) {
                $presId = $user->getPresidenteId();
                $query->where(function ($q) use ($presId) {
                    $q->where('presidente_id', $presId)
                      ->orWhere('parent_id', $presId);
                });
            }
        }

        return $query;
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$searchLower}%"])
              ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$searchLower}%"])
              ->orWhere('name', 'like', "%{$search}%")
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
                  ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"])
                  ->orWhereRaw('LOWER(name) LIKE ?', ["%{$valLower}%"]);
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

        if (isset($filters['created_at']) && is_array($filters['created_at']) && count($filters['created_at']) === 2) {
            $query->whereBetween('created_at', [$filters['created_at'][0] . ' 00:00:00', $filters['created_at'][1] . ' 23:59:59']);
        }
    }

    public function index(Request $request)
    {
        // Auto-reparar coordinadores que tengan parent_id pero presidente_id nulo
        User::where('role', UserRole::COORDINADOR_DISTRITO)
            ->whereNull('presidente_id')
            ->whereNotNull('parent_id')
            ->each(function ($coordinador) {
                $parent = User::find($coordinador->parent_id);
                if ($parent) {
                    $coordinador->presidente_id = $parent->getPresidenteId();
                    $coordinador->state_id = $coordinador->state_id ?: $parent->state_id;
                    $coordinador->municipality_id = $coordinador->municipality_id ?: $parent->municipality_id;
                    $coordinador->scope_level = $coordinador->scope_level ?: ($parent->scope_level ?: 'municipal');
                    $coordinador->saveQuietly();
                }
            });

        $response = parent::index($request);

        if ($response instanceof \Inertia\Response) {
            $user = $request->user();
            $presidentes = [];

            if ($user && in_array($user->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
                $presidentes = User::where('role', UserRole::PRESIDENTE)->get(['id', 'name', 'apodo']);
            }

            $response->with('availablePresidentes', $presidentes);
        }

        return $response;
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        $user = $request->user();
        $presidenteId = null;
        if ($id) {
            $existing = User::withoutGlobalScopes()->find($id);
            $presidenteId = $existing?->presidente_id;
        }
        if (!$presidenteId) {
            if ($request->filled('presidente_id')) {
                $presidenteId = $request->input('presidente_id');
            } elseif ($request->filled('parent_id')) {
                $parent = User::withoutGlobalScopes()->find($request->input('parent_id'));
                $presidenteId = $parent?->getPresidenteId();
            } elseif ($user) {
                $presidenteId = $user->getPresidenteId();
            }
        }

        return [
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
            'seccion_electoral' => ['nullable', 'string', 'max:255'],
            'clave_electoral' => [
                'nullable', 
                'string', 
                'size:18', 
                Rule::unique('users', 'clave_electoral')
                    ->when($presidenteId, fn ($rule) => $rule->where('presidente_id', $presidenteId))
                    ->whereNull('deleted_at')
                    ->ignore($id)
            ],
            'telefono' => ['nullable', 'digits:10'],
            'curp' => [
                'nullable', 
                'string', 
                'size:18', 
                Rule::unique('users', 'curp')
                    ->when($presidenteId, fn ($rule) => $rule->where('presidente_id', $presidenteId))
                    ->whereNull('deleted_at')
                    ->ignore($id)
            ],
            'apodo' => ['nullable', 'string', 'max:100'],
            'notas' => ['nullable', 'string'],
            'foto' => ['nullable', 'image'],
            'ine_frente' => ['nullable', 'image'],
            'ine_reverso' => ['nullable', 'image'],
            'password' => ['nullable', 'string', 'min:6'],
            'estado' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'exists:users,id'],
            'presidente_id' => ['nullable', 'exists:users,id'],
            'state_id' => ['nullable', 'integer'],
            'municipality_id' => ['nullable', 'integer'],
            'scope_level' => ['nullable', 'string'],
        ];
    }

    public function store(Request $request)
    {
        if ($request->has('nombre') && $request->has('apellidos')) {
            $request->merge(['name' => $request->nombre . ' ' . $request->apellidos]);
        }

        if (!$request->filled('email')) {
            $identificador = ($request->input('curp') ?: ($request->input('telefono') ?: uniqid())) . '_' . uniqid();
            $request->merge(['email' => strtolower($identificador) . '@sistema.local']);
        }
        
        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->merge(['password' => Hash::make('secret')]);
        }

        $user = $request->user();
        $presidente = null;

        if ($user) {
            if ($user->role === UserRole::PRESIDENTE) {
                $presidente = $user;
            } elseif ($user->role === UserRole::COORDINADOR_DISTRITO && $user->presidente_id) {
                $presidente = User::find($user->presidente_id);
            } elseif (in_array($user->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
                if ($request->filled('parent_id')) {
                    $presidente = User::find($request->input('parent_id'));
                } elseif ($user->presidente_id) {
                    $presidente = User::find($user->presidente_id);
                }
            }
        }

        if ($presidente) {
            $request->merge([
                'parent_id' => $presidente->id,
                'presidente_id' => $presidente->id,
                'state_id' => $presidente->state_id,
                'municipality_id' => $presidente->municipality_id,
                'scope_level' => $presidente->scope_level ?: 'municipal',
            ]);
        }

        $request->merge(['role' => UserRole::COORDINADOR_DISTRITO->value]);

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

    protected function afterStore(Request $request, Model $item): void
    {
        parent::afterStore($request, $item);

        if (empty($item->presidente_id) && $item->parent_id) {
            $parent = User::find($item->parent_id);
            if ($parent) {
                $item->presidente_id = $parent->getPresidenteId();
                $item->state_id = $item->state_id ?: $parent->state_id;
                $item->municipality_id = $item->municipality_id ?: $parent->municipality_id;
                $item->scope_level = $item->scope_level ?: ($parent->scope_level ?: 'municipal');
                $item->save();
            }
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, Model $item): void
    {
        parent::afterUpdate($request, $item);

        if ($request->filled('parent_id') && in_array($request->user()->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            $presidente = User::find($request->input('parent_id'));
            if ($presidente) {
                $item->parent_id = $presidente->id;
                $item->presidente_id = $presidente->id;
                $item->state_id = $presidente->state_id;
                $item->municipality_id = $presidente->municipality_id;
                $item->scope_level = $presidente->scope_level ?: 'municipal';
                $item->save();
            }
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function getExportHeaders(): array
    {
        return [
            'ID',
            'Nombre',
            'Apellidos',
            'Email',
            'Sexo',
            'Calle',
            'No. Exterior',
            'No. Interior',
            'Colonia',
            'Código Postal',
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
        return [
            'CD-' . str_pad($item->id, 4, '0', STR_PAD_LEFT),
            $item->nombre,
            $item->apellidos,
            $item->email,
            $item->sexo,
            $item->calle,
            $item->numero_exterior,
            $item->numero_interior,
            $item->colonia,
            $item->codigo_postal,
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
