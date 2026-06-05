<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

abstract class BaseCrudController extends Controller
{
    /**
     * El modelo de Eloquent a utilizar.
     */
    protected string $modelClass;

    /**
     * Componente React (Inertia) para el listado (Index)
     */
    protected string $indexView;

    /**
     * Nombre de la variable que se pasará a la vista con la data
     */
    protected string $dataKey = 'data';

    /**
     * Permite modificar la consulta base antes de paginar.
     * Útil para filtrar por roles.
     */
    protected function getBaseQuery(Request $request): Builder
    {
        $query = $this->modelClass::query();
        
        // Lógica base por defecto: si el usuario logueado es presidente,
        // restringimos la consulta a los registros que le pertenecen (jerarquía).
        $user = $request->user();
        if ($user && $user->role === 'presidente') {
            $query->where('parent_id', $user->id);
        }

        return $query;
    }

    /**
     * Valida si el usuario tiene acceso a este controlador.
     */
    protected function checkAccess(Request $request): void
    {
        // Por defecto todos los autenticados tienen acceso.
        // Se puede sobreescribir en cada controlador.
    }

    /**
     * Validación para crear/actualizar
     */
    abstract protected function getValidationRules(Request $request, ?string $id = null): array;

    public function index(Request $request)
    {
        $this->checkAccess($request);
        $query = $this->getBaseQuery($request);

        // Búsqueda genérica si se requiere
        if ($search = $request->input('search')) {
            $this->applySearch($query, $search);
        }

        // Filtros por columna (ProTable envía los inputs como query params: ?name=Juan&telefono=123)
        $filters = $request->except(['page', 'per_page', 'sort_field', 'sort_direction', 'search']);
        if (!empty($filters)) {
            $this->applyFilters($query, $filters);
        }

        // Ordenamiento genérico
        if ($sortField = $request->input('sort_field')) {
            $sortDirection = $request->input('sort_direction', 'asc');
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->latest();
        }

        // Permitir un límite de hasta 100 por seguridad
        $perPage = min((int) $request->input('per_page', 10), 100);
        $items = $query->paginate($perPage)->withQueryString();

        // Si la petición es asíncrona (como desde el ProTable request), devolvemos JSON
        if ($request->wantsJson()) {
            return response()->json($items);
        }

        return Inertia::render($this->indexView, [
            $this->dataKey => $items
        ]);
    }

    public function store(Request $request)
    {
        $this->checkAccess($request);
        $validated = $request->validate($this->getValidationRules($request));
        
        $item = $this->modelClass::create($validated);
        
        $this->afterStore($request, $item);

        return redirect()->back()->with('success', 'Registro creado exitosamente.');
    }

    public function show(Request $request, string $id)
    {
        $this->checkAccess($request);
        $item = $this->getBaseQuery($request)->findOrFail($id);
        // Retornamos JSON puro para que el request del Modal funcione correctamente
        return response()->json($item);
    }

    public function update(Request $request, string $id)
    {
        $this->checkAccess($request);
        $validated = $request->validate($this->getValidationRules($request, $id));
        
        $item = $this->getBaseQuery($request)->findOrFail($id);
        $item->update($validated);
        
        $this->afterUpdate($request, $item);

        return redirect()->back()->with('success', 'Registro actualizado exitosamente.');
    }

    public function destroy(Request $request, string $id)
    {
        $this->checkAccess($request);
        $item = $this->getBaseQuery($request)->findOrFail($id);
        $item->delete();

        return redirect()->back()->with('success', 'Registro eliminado exitosamente.');
    }

    // Hooks opcionales
    protected function applySearch(Builder $query, string $search): void {}
    protected function applyFilters(Builder $query, array $filters): void {}
    
    protected function afterStore(Request $request, Model $item): void 
    {
        // Asignación de jerarquía por defecto al crear registros
        $user = $request->user();
        if ($user && $user->role === 'presidente') {
            $item->parent_id = $user->id;
            $item->save();
        }
    }
    
    protected function afterUpdate(Request $request, Model $item): void {}
}
