<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class PresidenteController extends BaseCrudController
{
    protected string $modelClass = User::class;
    protected string $indexView = 'Presidentes/Index';
    protected string $dataKey = 'presidentes';

    protected function checkAccess(Request $request): void
    {
        abort_if(!in_array($request->user()->role, [UserRole::SUPERUSER], true), 403, 'Acceso denegado. Solo los administradores pueden gestionar presidentes.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        return User::query()
            ->where('role', UserRole::PRESIDENTE)
            ->with(['state', 'municipality'])
            ->withCount([
                'subordinates as rds_count' => function ($query) {
                    $query->where('role', UserRole::RD);
                },
                'subordinates as operadores_count' => function ($query) {
                    $query->where('role', UserRole::OPERADOR);
                },
                'subordinates as promotores_count' => function ($query) {
                    $query->where('role', UserRole::PROMOTOR);
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
        $name = $filters['nombre'] ?? $filters['name'] ?? null;
        if ($name !== null && $name !== '') {
            $valLower = strtolower($name);
            $query->where(function ($q) use ($valLower) {
                $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"])
                    ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"])
                    ->orWhereRaw('LOWER(name) LIKE ?', ["%{$valLower}%"]);
            });
        }

        if (isset($filters['apellidos']) && $filters['apellidos'] !== '') {
            $valLower = strtolower($filters['apellidos']);
            $query->whereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"]);
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

        if (isset($filters['state_id']) && $filters['state_id'] !== '') {
            $query->where('state_id', $filters['state_id']);
        }

        if (isset($filters['municipality_id']) && $filters['municipality_id'] !== '') {
            $query->where('municipality_id', $filters['municipality_id']);
        }

        if (isset($filters['created_at']) && is_array($filters['created_at']) && count($filters['created_at']) === 2) {
            $query->whereBetween('created_at', [$filters['created_at'][0] . ' 00:00:00', $filters['created_at'][1] . ' 23:59:59']);
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
            'clave_electoral' => ['nullable', 'string', 'max:255', Rule::unique('users', 'clave_electoral')->ignore($id)],
            'telefono' => ['nullable', 'string', 'max:20'],
            'curp' => ['nullable', 'string', 'max:255', Rule::unique('users', 'curp')->ignore($id)],
            'apodo' => ['nullable', 'string', 'max:100'],
            'notas' => ['nullable', 'string'],
            'foto' => ['nullable', 'image'],
            'ine_frente' => ['nullable', 'image'],
            'ine_reverso' => ['nullable', 'image'],
            'password' => ['nullable', 'string', 'min:6'],
            'estado' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string'],
            'scope_level' => ['nullable', 'string'],
            'candidate_type' => ['nullable', 'string'],
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

        if ($request->has('estado')) {
            $request->merge([
                'estado' => filter_var($request->input('estado'), FILTER_VALIDATE_BOOLEAN)
            ]);
        }

        $request->merge([
            'role' => UserRole::PRESIDENTE->value,
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

        if ($request->has('estado')) {
            $request->merge([
                'estado' => filter_var($request->input('estado'), FILTER_VALIDATE_BOOLEAN)
            ]);
        }

        $request->merge([
            'role' => UserRole::PRESIDENTE->value,
            'scope_level' => 'municipal',
            'candidate_type' => 'presidente_municipal'
        ]);

        return parent::update($request, $id);
    }

    protected function afterStore(Request $request, $item): void
    {
        parent::afterStore($request, $item);
        // Garantizar que presidente_id apunta a su propio ID si no fue asignado
        if (empty($item->presidente_id)) {
            $item->presidente_id = $item->id;
            $item->saveQuietly();
        }
        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        parent::afterUpdate($request, $item);
        $this->handlePhotoUpload($request, $item);
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
            $item->saveQuietly();
        }
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

    public function toggleStatus(Request $request, string $id)
    {
        $this->checkAccess($request);

        $user = User::where('role', UserRole::PRESIDENTE)->findOrFail($id);

        $estado = filter_var($request->input('estado'), FILTER_VALIDATE_BOOLEAN);
        $user->estado = $estado;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Estatus del presidente actualizado exitosamente.',
            'estado' => $user->estado
        ]);
    }
}
