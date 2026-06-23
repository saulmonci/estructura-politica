<?php

namespace App\Http\Controllers;

use App\Models\Demarcacion;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DemarcacionController extends BaseCrudController
{
    protected string $modelClass = Demarcacion::class;
    protected string $indexView = 'Demarcaciones/Index';
    protected string $dataKey = 'demarcaciones';

    protected function checkAccess(Request $request): void
    {
        // Solo el Presidente tiene acceso para administrar las demarcaciones
        abort_if(!$request->user() || $request->user()->role !== 'presidente', 403, 'Acceso denegado. Solo el Presidente puede administrar las demarcaciones.');
    }

    protected function getBaseQuery(Request $request): Builder
    {
        $driver = DB::getDriverName();
        $query = $this->modelClass::query();
        
        // Exponer el geom como WKT legible transformado a EPSG:4326
        if ($driver === 'mysql') {
            $query->select('id', 'nombre', 'meta', DB::raw('ST_AsText(geom) as wkt_polygon'));
        } else {
            // PostgreSQL PostGIS
            $query->select('id', 'nombre', 'meta', DB::raw('ST_AsText(ST_Transform(geom, 4326)) as wkt_polygon'));
        }

        return $query;
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
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if ($field === 'nombre') {
                $valLower = strtolower($value);
                $query->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"]);
            }

            if ($field === 'meta') {
                $query->where('meta', $value);
            }
        }
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        // Validar estrictamente la estructura WKT del polígono para evitar inyección SQL
        $wktRegex = '/^POLYGON\s*\(\s*\(\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?)*\s*\)\s*\)$/i';

        $rules = [
            'nombre' => ['required', 'string', 'max:255'],
            'meta' => ['required', 'integer', 'min:0'],
            'wkt_polygon' => ['nullable', 'string', 'regex:' . $wktRegex],
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
            'id.unique' => 'El número de demarcación ya está registrado.',
            'wkt_polygon.regex' => 'El formato del polígono WKT no es válido. Debe ser del tipo POLYGON((lng lat, lng lat, ...)).'
        ];
    }

    public function store(Request $request)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request),
            $this->getValidationMessages($request)
        );
        
        $driver = DB::getDriverName();
        $geomSql = null;
        if (!empty($validated['wkt_polygon'])) {
            $wkt = $validated['wkt_polygon'];
            if ($driver === 'mysql') {
                $geomSql = DB::raw("ST_Transform(ST_GeomFromText('{$wkt}', 4326, 'axis-order=long-lat'), 32613)");
            } else {
                $geomSql = DB::raw("ST_Transform(ST_GeomFromText('{$wkt}', 4326), 32613)");
            }
        }

        Demarcacion::create([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'meta' => $validated['meta'],
            'geom' => $geomSql,
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
        
        $driver = DB::getDriverName();
        $geomSql = null;
        if (!empty($validated['wkt_polygon'])) {
            $wkt = $validated['wkt_polygon'];
            if ($driver === 'mysql') {
                $geomSql = DB::raw("ST_Transform(ST_GeomFromText('{$wkt}', 4326, 'axis-order=long-lat'), 32613)");
            } else {
                $geomSql = DB::raw("ST_Transform(ST_GeomFromText('{$wkt}', 4326), 32613)");
            }
        }

        $demarcacion->update([
            'id' => $validated['id'],
            'nombre' => $validated['nombre'],
            'meta' => $validated['meta'],
            'geom' => $geomSql,
        ]);

        return redirect()->back()->with('success', 'Demarcación actualizada exitosamente.');
    }

    protected function getExportHeaders(): array
    {
        return ['ID', 'Nombre', 'Meta de Votantes', 'Polígono WKT', 'Fecha de Registro'];
    }

    protected function getExportRow($item): array
    {
        return [
            $item->id,
            $item->nombre,
            $item->meta,
            $item->wkt_polygon ?: 'No definido',
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
