<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class PresidenteController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Presidentes/Index';
    protected string $dataKey = 'presidentes';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, ['superuser']), 403, 'Acceso denegado. Solo los administradores pueden gestionar presidentes.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        return User::query()
            ->where('role', 'presidente')
            ->with(['state', 'municipality'])
            ->withCount([
                'subordinates as rds_count' => function ($query) {
                    $query->where('role', 'rd');
                },
                'subordinates as operadores_count' => function ($query) {
                    $query->where('role', 'operador');
                },
                'subordinates as promotores_count' => function ($query) {
                    $query->where('role', 'promotor');
                }
            ]);
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function ($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$searchLower}%"])
                ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$searchLower}%"])
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('telefono', 'like', "%{$search}%")
                ->orWhere('curp', 'like', "%{$search}%")
                ->orWhere('clave_electoral', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if ($field === 'nombre') {
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

            if ($field === 'state_id') {
                $query->where('state_id', $value);
            }

            if ($field === 'municipality_id') {
                $query->where('municipality_id', $value);
            }

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
            'state_id' => ['nullable', 'exists:states,id'],
            'municipality_id' => ['nullable', 'exists:municipalities,id'],
            'calle' => ['nullable', 'string', 'max:255'],
            'numero_exterior' => ['nullable', 'string', 'max:50'],
            'numero_interior' => ['nullable', 'string', 'max:50'],
            'colonia' => ['nullable', 'string', 'max:255'],
            'codigo_postal' => ['nullable', 'digits:5'],
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
        ];
    }

    public function store(Request $request)
    {
        if ($request->has('nombre') && $request->has('apellidos')) {
            $request->merge(['name' => $request->nombre . ' ' . $request->apellidos]);
        }

        if (!$request->filled('email')) {
            $identificador = $request->input('curp') ?: ($request->input('telefono') ?: uniqid());
            $request->merge(['email' => 'presidente_' . $identificador . '@sistema.local']);
        }

        if ($request->filled('password')) {
            $request->merge(['password' => Hash::make($request->password)]);
        } else {
            $request->merge(['password' => Hash::make('secret123')]);
        }

        $request->merge([
            'role' => 'presidente',
            'scope_level' => 'municipal',
            'candidate_type' => 'presidente_municipal'
        ]);

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

        $request->merge([
            'role' => 'presidente',
            'scope_level' => 'municipal',
            'candidate_type' => 'presidente_municipal'
        ]);

        return parent::update($request, $id);
    }

    public function export(Request $request)
    {
        $this->checkAccess($request);

        $query = $this->getBaseQuery($request);

        if ($search = $request->input('search')) {
            $this->applySearch($query, $search);
        }

        if ($filtersJson = $request->input('filters')) {
            $filters = json_decode($filtersJson, true);
            if (is_array($filters)) {
                $this->applyFilters($query, $filters);
            }
        }

        $items = $query->latest()->get();

        $filename = 'presidentes_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($items) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, [
                'ID',
                'Nombre',
                'Apellidos',
                'Email',
                'Teléfono',
                'Estado (Entidad)',
                'Municipio',
                'CURP',
                'Clave Electoral',
                'Estatus',
                'Fecha Registro'
            ]);

            foreach ($items as $item) {
                fputcsv($file, [
                    $item->id,
                    $item->nombre,
                    $item->apellidos,
                    $item->email,
                    $item->telefono,
                    $item->state?->name ?? 'N/A',
                    $item->municipality?->name ?? 'N/A',
                    $item->curp,
                    $item->clave_electoral,
                    $item->estado ? 'Activo' : 'Inactivo',
                    $item->created_at?->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
