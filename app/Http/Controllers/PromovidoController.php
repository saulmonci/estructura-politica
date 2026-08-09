<?php

namespace App\Http\Controllers;

use App\Models\Promovido;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use App\Enums\UserRole;

class PromovidoController extends BaseCrudController
{
    protected string $modelClass = Promovido::class;
    protected string $indexView = 'Promovidos/Index';
    protected string $dataKey = 'promovidos';

    protected function getBaseQuery(Request $request): Builder
    {
        $user = $request->user();
        
        if (!$user) {
            return Promovido::query()->with(['state', 'municipality', 'demarcacion']);
        }

        // Si es un rol administrativo/campaña, cargamos todos bajo su scope territorial
        if (in_array($user->role, [UserRole::SUPERUSER, UserRole::ADMIN], true)) {
            return Promovido::query()->with(['state', 'municipality', 'demarcacion']);
        }

        // Usamos la función optimizada del modelo User para obtener promovidos
        return $user->queryPromovidos()->with(['state', 'municipality', 'demarcacion']);
    }

    public function index(Request $request)
    {
        $response = parent::index($request);

        // Si estamos retornando la vista de Inertia, inyectamos los Promotores disponibles
        if ($response instanceof \Inertia\Response) {
            $user = $request->user();
            $promotores = [];
            
            if ($user) {
                if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
                    $promotores = User::where('role', UserRole::PROMOTOR)->where('presidente_id', $user->getPresidenteId())->get(['id', 'name', 'apodo']);
                } elseif ($user->role === UserRole::RD) {
                    $operadoresIds = User::where('role', UserRole::OPERADOR)->where('parent_id', $user->id)->pluck('id');
                    $promotores = User::where('role', UserRole::PROMOTOR)
                        ->where(function($q) use ($user, $operadoresIds) {
                            $q->where('parent_id', $user->id)
                              ->orWhereIn('parent_id', $operadoresIds);
                        })
                        ->get(['id', 'name', 'apodo']);
                } elseif ($user->role === UserRole::OPERADOR) {
                    $promotores = User::where('role', UserRole::PROMOTOR)->where('parent_id', $user->id)->get(['id', 'name', 'apodo']);
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
        if (isset($filters['nombre']) && $filters['nombre'] !== '') {
            $valLower = strtolower($filters['nombre']);
            $query->whereRaw('LOWER(nombre) LIKE ?', ["%{$valLower}%"]);
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

        if (isset($filters['seccion_electoral']) && $filters['seccion_electoral'] !== '') {
            $query->where('seccion_electoral', 'like', "%{$filters['seccion_electoral']}%");
        }

        if (isset($filters['promotor_id']) && $filters['promotor_id'] !== '') {
            $query->where('promotor_id', $filters['promotor_id']);
        }

        if (isset($filters['state_id']) && $filters['state_id'] !== '') {
            $query->where('state_id', $filters['state_id']);
        }

        if (isset($filters['municipality_id']) && $filters['municipality_id'] !== '') {
            $query->where('municipality_id', $filters['municipality_id']);
        }

        if (isset($filters['demarcacion_id']) && $filters['demarcacion_id'] !== '') {
            $query->where('demarcacion_id', $filters['demarcacion_id']);
        }

        if (isset($filters['created_at']) && is_array($filters['created_at']) && count($filters['created_at']) === 2) {
            $query->whereBetween('created_at', [$filters['created_at'][0] . ' 00:00:00', $filters['created_at'][1] . ' 23:59:59']);
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
        if ($user && $user->role === UserRole::PROMOTOR) {
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
            'foto' => ['nullable', 'image'],
            'ine_frente' => ['nullable', 'image'],
            'ine_reverso' => ['nullable', 'image'],
        ];

        if ($user) {
            if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
                $rules['promotor_id'] = [
                    'required', 
                    \Illuminate\Validation\Rule::exists('users', 'id')->where('role', UserRole::PROMOTOR->value)->where('presidente_id', $user->getPresidenteId())
                ];
            } elseif ($user->role === UserRole::RD) {
                // RD solo puede asignar a un promotor de su red
                $operadoresIds = \App\Models\User::where('role', UserRole::OPERADOR)->where('parent_id', $user->id)->pluck('id')->toArray();
                $rules['promotor_id'] = [
                    'required', 
                    \Illuminate\Validation\Rule::exists('users', 'id')
                        ->where('role', UserRole::PROMOTOR->value)
                        ->where(function ($query) use ($user, $operadoresIds) {
                            $query->where('parent_id', $user->id)
                                  ->orWhereIn('parent_id', $operadoresIds);
                        })
                ];
            } elseif ($user->role === UserRole::OPERADOR) {
                $rules['promotor_id'] = [
                    'required', 
                    \Illuminate\Validation\Rule::exists('users', 'id')->where('role', UserRole::PROMOTOR->value)->where('parent_id', $user->id)
                ];
            } elseif (in_array($user->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
                $rules['promotor_id'] = ['required', \Illuminate\Validation\Rule::exists('users', 'id')->where('role', UserRole::PROMOTOR->value)];
            }
        }

        return $rules;
    }

    protected function handlePhotoUpload(Request $request, $item): void
    {
        /** @var \App\Models\Promovido $item */
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
        /** @var \App\Models\Promovido $item */
        $user = $request->user();
        
        if ($user && $user->role === UserRole::PROMOTOR) {
            $item->promotor_id = $user->id;
            $item->save();
        } elseif ($user && in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO, UserRole::RD, UserRole::OPERADOR], true)) {
            if ($request->has('promotor_id')) {
                $item->promotor_id = $request->input('promotor_id');
                $item->save();
            }
        }

        $this->handlePhotoUpload($request, $item);
    }

    protected function afterUpdate(Request $request, $item): void
    {
        /** @var \App\Models\Promovido $item */
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
        /** @var \App\Models\Promovido $item */
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
