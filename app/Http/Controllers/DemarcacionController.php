<?php

namespace App\Http\Controllers;

use App\Models\Demarcacion;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule;
use App\Enums\UserRole;

class DemarcacionController extends BaseCrudController
{
    protected string $modelClass = Demarcacion::class;
    protected string $indexView = 'Demarcaciones/Index';
    protected string $dataKey = 'demarcaciones';

    protected function checkAccess(Request $request): void
    {
        // Solo el Presidente tiene acceso para administrar las demarcaciones
        abort_if(!$request->user() || !in_array($request->user()->role, [UserRole::PRESIDENTE, UserRole::ADMIN, UserRole::SUPERUSER], true), 403, 'Acceso denegado. Solo los administradores pueden administrar las demarcaciones.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        return $this->modelClass::query()->select('id', 'nombre', 'meta');
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $searchLower = strtolower($search);
        $query->where(function($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$searchLower}%"])
              ->orWhere('id', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        if (isset($filters['nombre']) && $filters['nombre'] !== '') {
            $valLower = strtolower($filters['nombre']);
            $query->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"]);
        }

        if (isset($filters['meta']) && $filters['meta'] !== '') {
            $query->where('meta', $filters['meta']);
        }
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        $rules = [
            'nombre' => ['required', 'string', 'max:255'],
            'meta' => ['required', 'integer', 'min:0'],
        ];

        if (!$id) {
            $rules['id'] = ['required', 'integer', 'min:1', 'unique:demarcaciones,id'];
        } else {
            $rules['id'] = ['required', 'integer', 'min:1', Rule::unique('demarcaciones', 'id')->ignore($id)];
        }

        return $rules;
    }

    protected function getValidationMessages(Request $request): array
    {
        return [
            'id.unique' => 'El número de demarcación ya está registrado.'
        ];
    }

    public function store(Request $request)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request),
            $this->getValidationMessages($request)
        );

        Demarcacion::create([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'meta' => $validated['meta'],
        ]);

        return redirect()->back()->with('success', 'Demarcación creada exitosamente.');
    }

    public function update(Request $request, string $id)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request, $id),
            $this->getValidationMessages($request)
        );
        
        $demarcacion = Demarcacion::findOrFail($id);
        
        $demarcacion->update([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'meta' => $validated['meta'],
        ]);

        return redirect()->back()->with('success', 'Demarcación actualizada exitosamente.');
    }

    protected function getExportHeaders(): array
    {
        return ['ID', 'Nombre', 'Meta de Votantes', 'Fecha de Registro'];
    }

    protected function getExportRow($item): array
    {
        return [
            $item->id,
            $item->nombre,
            $item->meta,
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
