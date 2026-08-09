<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class RepresentanteDemarcacionController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Representantes/Index';
    protected string $dataKey = 'representantes';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::ADMIN, UserRole::SUPERUSER], true), 403, 'Acceso denegado. Solo los administradores pueden ver esto.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        // El filtrado por jerarquía (parent_id) ya se hereda de BaseCrudController
        return parent::getBaseQuery($request)->where('role', UserRole::RD)
            ->with(['demarcacion', 'demarcacionAsignada'])
            ->withCount(['subordinates as operadores_count' => function ($query) {
                $query->where('role', UserRole::OPERADOR);
            }]);
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function($q) use ($searchLower, $search) {
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

        if (isset($filters['created_at']) && is_array($filters['created_at']) && count($filters['created_at']) === 2) {
            $query->whereBetween('created_at', [$filters['created_at'][0] . ' 00:00:00', $filters['created_at'][1] . ' 23:59:59']);
        }
    }

    public function index(Request $request)
    {
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
            'demarcacion_id' => ['nullable', 'exists:demarcaciones,id'],
            'demarcacion_asignada_id' => ['nullable', 'exists:demarcaciones,id'],
            'seccion_electoral' => ['nullable', 'string', 'max:255'],
            'clave_electoral' => ['nullable', 'string', 'size:18', Rule::unique('users', 'clave_electoral')->ignore($id)],
            'telefono' => ['nullable', 'digits:10'],
            'curp' => ['nullable', 'string', 'size:18', Rule::unique('users', 'curp')->ignore($id)],
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
        ];
    }
    
    public function store(Request $request)
    {
        if ($request->has('nombre') && $request->has('apellidos')) {
            $request->merge(['name' => $request->nombre . ' ' . $request->apellidos]);
        }

        // Si no mandan email (ya que no está en el form actual), generamos uno falso por convención o pedimos que lo llenen.
        // Como el email es required en el migration original y unique, crearemos uno dummy basado en la curp o telefono.
        if (!$request->filled('email')) {
            $identificador = $request->input('curp') ?: ($request->input('telefono') ?: uniqid());
            $request->merge(['email' => $identificador . '@sistema.local']);
        }
        
        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->merge(['password' => Hash::make('secret')]);
        }

        $request->merge(['role' => UserRole::RD->value]);

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
        // Ejecutamos la lógica base (que ya asocia el parent_id al presidente si lo crea él mismo)
        parent::afterStore($request, $item);

        // Si lo crea un admin, el parent_id quedará nulo por defecto en la lógica base.
        // Asignamos el parent_id al presidente correspondiente al admin.
        if (empty($item->parent_id)) {
            $user = $request->user();
            $presidente = null;
            
            if ($user) {
                // Si el admin ya tiene un presidente asociado (gracias a AssociateAdminsToPresidentesSeeder)
                if ($user->presidente_id) {
                    $presidente = User::find($user->presidente_id);
                } 
                // Fallback dinámico por municipio
                elseif ($user->scope_level === 'municipal' && $user->municipality_id) {
                    $presidente = User::where('role', UserRole::PRESIDENTE)
                                      ->where('scope_level', 'municipal')
                                      ->where('municipality_id', $user->municipality_id)
                                      ->first();
                }
                // Fallback dinámico por estado
                elseif (in_array($user->scope_level, ['municipal', 'estatal']) && $user->state_id) {
                    $presidente = User::where('role', UserRole::PRESIDENTE)
                                      ->where('scope_level', 'estatal')
                                      ->where('state_id', $user->state_id)
                                      ->first();
                }
            }
            
            // Fallback al presidente global si no hay específicos
            if (!$presidente) {
                $presidente = User::where('role', UserRole::PRESIDENTE)->first();
            }

            if ($presidente) {
                $item->parent_id = $presidente->id;
                $item->presidente_id = $presidente->id;
                $item->save();
            }
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        parent::afterUpdate($request, $item);

        if ($request->filled('parent_id') && in_array($request->user()->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            $item->presidente_id = $item->parent_id;
            $item->save();
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function getExportHeaders(): array
    {
        return [
            'ID', 'Nombre', 'Apellidos', 'Email', 'Sexo', 'Calle', 'No. Exterior', 'No. Interior', 
            'Colonia', 'Código Postal', 'Demarcación Personal', 'Demarcación Asignada', 'Sección Electoral', 'Clave Electoral', 
            'Teléfono', 'CURP', 'Apodo', 'Estatus', 'Notas', 'Fecha de Registro', 'Total Operadores'
        ];
    }

    protected function getExportRow($item): array
    {
        return [
            'RD-' . str_pad($item->id, 4, '0', STR_PAD_LEFT),
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
            $item->demarcacionAsignada?->nombre,
            $item->seccion_electoral,
            $item->clave_electoral,
            $item->telefono,
            $item->curp,
            $item->apodo,
            $item->estado ? 'Activo' : 'Inactivo',
            $item->notas,
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
            $item->operadores_count ?? 0,
        ];
    }
}
