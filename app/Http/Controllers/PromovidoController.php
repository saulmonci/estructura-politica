<?php

namespace App\Http\Controllers;

use App\Models\Promovido;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;

class PromovidoController extends BaseCrudController
{
    protected string $modelClass = Promovido::class;
    protected string $indexView = 'Promovidos/Index';
    protected string $dataKey = 'promovidos';

    protected function getBaseQuery(Request $request): Builder
    {
        $user = $request->user();
        
        if (!$user) {
            return Promovido::query();
        }

        // Usamos la función optimizada del modelo User para obtener promovidos
        return $user->queryPromovidos();
    }

    public function index(Request $request)
    {
        $response = parent::index($request);

        // Si estamos retornando la vista de Inertia, inyectamos los Promotores disponibles
        if ($response instanceof \Inertia\Response) {
            $user = $request->user();
            $promotores = [];
            
            if ($user) {
                if ($user->role === 'presidente') {
                    $promotores = User::where('role', 'promotor')->get(['id', 'name', 'apodo']);
                } elseif ($user->role === 'rd') {
                    $operadoresIds = User::where('role', 'operador')->where('parent_id', $user->id)->pluck('id');
                    $promotores = User::where('role', 'promotor')->whereIn('parent_id', $operadoresIds)->get(['id', 'name', 'apodo']);
                } elseif ($user->role === 'operador') {
                    $promotores = User::where('role', 'promotor')->where('parent_id', $user->id)->get(['id', 'name', 'apodo']);
                }
            }
            
            $response->with('availablePromotores', $promotores);
        }

        return $response;
    }

    protected function applySearch(Builder $query, string $search): void
    {
        $query->where(function($q) use ($search) {
            $q->where('nombre_completo', 'like', "%{$search}%")
              ->orWhere('telefono', 'like', "%{$search}%")
              ->orWhere('clave_elector', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if (in_array($field, ['nombre_completo', 'telefono', 'colonia', 'seccion_electoral'])) {
                $query->where($field, 'like', "%{$value}%");
            }
            
            if ($field === 'promotor_id') {
                $query->where('promotor_id', $value);
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
            'nombre_completo' => ['required', 'string', 'max:255'],
            'clave_elector' => ['nullable', 'string', 'max:50'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'seccion_electoral' => ['nullable', 'string', 'max:50'],
            'colonia' => ['nullable', 'string', 'max:255'],
            'foto' => ['nullable', 'image', 'max:15360'],
        ];

        if ($user && in_array($user->role, ['presidente', 'rd', 'operador'])) {
            $rules['promotor_id'] = ['required', 'exists:users,id'];
        }

        return $rules;
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
        $user = $request->user();
        
        if ($user && $user->role === 'promotor') {
            $item->promotor_id = $user->id;
            $item->save();
        } elseif ($user && in_array($user->role, ['presidente', 'rd', 'operador'])) {
            if ($request->has('promotor_id')) {
                $item->promotor_id = $request->input('promotor_id');
                $item->save();
            }
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        parent::afterUpdate($request, $item);
        $this->handlePhotoUpload($request, $item);
    }
}
