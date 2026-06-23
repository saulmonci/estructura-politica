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
            return Promovido::query()->with('demarcacion');
        }

        // Usamos la función optimizada del modelo User para obtener promovidos
        return $user->queryPromovidos()->with('demarcacion');
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
                    $promotores = User::where('role', 'promotor')
                        ->where(function($q) use ($user, $operadoresIds) {
                            $q->where('parent_id', $user->id)
                              ->orWhereIn('parent_id', $operadoresIds);
                        })
                        ->get(['id', 'name', 'apodo']);
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
        $searchLower = strtolower($search);
        $query->where(function($q) use ($searchLower, $search) {
            $q->whereRaw('LOWER(nombre) LIKE ?', ["%{$searchLower}%"])
              ->orWhereRaw('LOWER(apellidos) LIKE ?', ["%{$searchLower}%"])
              ->orWhereRaw("LOWER(CONCAT(nombre, ' ', apellidos)) LIKE ?", ["%{$searchLower}%"])
              ->orWhere('telefono', 'like', "%{$search}%")
              ->orWhere('clave_elector', 'like', "%{$search}%");
        });
    }

    protected function applyFilters(Builder $query, array $filters): void
    {
        foreach ($filters as $field => $value) {
            if ($value === null || $value === '') continue;

            if ($field === 'nombre') {
                $valLower = strtolower($value);
                $query->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"]);
            } elseif ($field === 'apellidos') {
                $valLower = strtolower($value);
                $query->whereRaw('LOWER(apellidos) LIKE ?', ["%{$valLower}%"]);
            } elseif (in_array($field, ['telefono', 'colonia', 'seccion_electoral'])) {
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

    public function store(Request $request)
    {
        $this->checkAccess($request);
        $validated = $request->validate(
            $this->getValidationRules($request),
            $this->getValidationMessages($request)
        );
        
        $user = $request->user();
        if ($user && $user->role === 'promotor') {
            $validated['promotor_id'] = $user->id;
        }

        $item = $this->modelClass::create($validated);
        
        $this->afterStore($request, $item);

        return redirect()->back()->with('success', 'Registro creado exitosamente.');
    }

    protected function getValidationRules(Request $request, ?string $id = null): array
    {
        $user = $request->user();
        $rules = [
            'nombre'    => ['required', 'string', 'max:100'],
            'apellidos' => ['required', 'string', 'max:100'],
            'clave_elector'     => [
                'nullable', 
                'string', 
                'max:18', 
                \Illuminate\Validation\Rule::unique('promovidos', 'clave_elector')->ignore($id)
            ],
            'curp'              => [
                'nullable', 
                'string', 
                'max:18', 
                \Illuminate\Validation\Rule::unique('promovidos', 'curp')->ignore($id)
            ],
            'telefono'          => ['nullable', 'string', 'max:10'],
            'demarcacion_id'    => ['nullable', 'exists:demarcaciones,id'],
            'seccion_electoral' => ['nullable', 'string', 'max:10'],
            'colonia'           => ['nullable', 'string', 'max:255'],
            'calle'             => ['nullable', 'string', 'max:255'],
            'numero'            => ['nullable', 'string', 'max:50'],
            'codigo_postal'     => ['nullable', 'string', 'max:5'],
            'foto'              => ['nullable', 'image', 'max:5120'],
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

    protected function getExportHeaders(): array
    {
        return [
            'ID', 'Asignado a (Promotor)', 'Nombre', 'Apellidos', 'CURP', 'Clave de Elector', 
            'Teléfono', 'Demarcación', 'Sección Electoral', 'Colonia', 'Calle', 'Número', 'Código Postal', 'Fecha de Registro'
        ];
    }

    protected function getExportRow($item): array
    {
        $promotor = $item->promotor;
        return [
            '#' . str_pad($item->id, 5, '0', STR_PAD_LEFT),
            $promotor ? $promotor->name : 'No asignado',
            $item->nombre,
            $item->apellidos,
            $item->curp,
            $item->clave_elector,
            $item->telefono,
            $item->demarcacion?->nombre,
            $item->seccion_electoral,
            $item->colonia,
            $item->calle,
            $item->numero,
            $item->codigo_postal,
            $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
        ];
    }
}
