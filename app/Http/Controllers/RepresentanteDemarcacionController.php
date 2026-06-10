<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class RepresentanteDemarcacionController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Representantes/Index';
    protected string $dataKey = 'representantes';

    protected function checkAccess(Request $request): void
    {
        abort_if($request->user()->role !== 'presidente', 403, 'Acceso denegado. Solo el Presidente puede ver esto.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        // El filtrado por jerarquía (parent_id) ya se hereda de BaseCrudController
        return parent::getBaseQuery($request)->where('role', 'rd');
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
        foreach ($filters as $field => $value) {
            // Ignoramos valores nulos o vacíos
            if ($value === null || $value === '') continue;

            // Filtros de texto
            if ($field === 'name') {
                $valLower = strtolower($value);
                $query->where(function($q) use ($valLower) {
                    $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"])
                      ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"]);
                });
            } elseif (in_array($field, ['telefono', 'colonia'])) {
                $query->where($field, 'like', "%{$value}%");
            }

            // Filtro de estado
            if ($field === 'estado') {
                $query->where('estado', $value);
            }

            // Filtro de fecha (Rango enviado por ProTable: ['2026-06-01', '2026-06-30'])
            if ($field === 'created_at' && is_array($value) && count($value) === 2) {
                $query->whereBetween('created_at', [$value[0] . ' 00:00:00', $value[1] . ' 23:59:59']);
            }
        }
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
            'demarcacion' => ['nullable', 'string', 'max:255'],
            'clave_electoral' => ['nullable', 'string', 'size:18'],
            'telefono' => ['nullable', 'digits:10'],
            'curp' => ['nullable', 'string', 'size:18'],
            'apodo' => ['nullable', 'string', 'max:100'],
            'notas' => ['nullable', 'string'],
            'foto' => ['nullable', 'image', 'max:15360'],
            'password' => ['nullable', 'string', 'min:6'],
            'estado' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string'],
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

        $request->merge(['role' => 'rd']);

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
        if ($request->hasFile('foto')) {
            $path = $request->file('foto')->store('fotos', 'public');
            $item->foto = $path;
            $item->save();
        }
    }

    protected function afterStore(Request $request, $item): void
    {
        // Ejecutamos la lógica base (que ya asocia el parent_id al presidente)
        parent::afterStore($request, $item);

        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        parent::afterUpdate($request, $item);
        $this->handlePhotoUpload($request, $item);
    }
}
