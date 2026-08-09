<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use App\Enums\UserRole;

class TerritoryScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Prevent scope application in console commands (artisan seed/migrate) or when user is not yet resolved, but ALLOW during tests
        if ((app()->runningInConsole() && !app()->runningUnitTests()) || !Auth::hasUser()) {
            return;
        }

        $user = Auth::user();

        // Superusers can see everything, do not filter them
        if ($user->role === UserRole::SUPERUSER) {
            return;
        }

        $table = $model->getTable();

        // Caso especial: Presidente y Coordinador de Distrito
        if (in_array($user->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $user->getPresidenteId();
            $stateId = $user->state_id;
            $municipalityId = $user->municipality_id;

            if ($presId && (!$stateId || !$municipalityId)) {
                $pres = \App\Models\User::withoutGlobalScopes()->find($presId);
                if ($pres) {
                    $stateId = $stateId ?: $pres->state_id;
                    $municipalityId = $municipalityId ?: $pres->municipality_id;
                }
            }

            $builder->where(function ($query) use ($table, $municipalityId, $stateId, $presId, $user) {
                $hasCondition = false;
                if ($presId && $this->hasColumn($table, 'presidente_id')) {
                    $query->where($table . '.presidente_id', $presId);
                    $hasCondition = true;
                }
                if ($this->hasColumn($table, 'parent_id')) {
                    if ($hasCondition) {
                        $query->orWhere($table . '.parent_id', $user->id);
                        if ($presId) $query->orWhere($table . '.parent_id', $presId);
                    } else {
                        $query->where($table . '.parent_id', $user->id);
                        if ($presId) $query->orWhere($table . '.parent_id', $presId);
                        $hasCondition = true;
                    }
                }
                if ($municipalityId && $this->hasColumn($table, 'municipality_id')) {
                    if ($hasCondition) {
                        $query->orWhere($table . '.municipality_id', $municipalityId);
                    } else {
                        $query->where($table . '.municipality_id', $municipalityId);
                        $hasCondition = true;
                    }
                }
                if ($stateId && $this->hasColumn($table, 'state_id')) {
                    if ($hasCondition) {
                        $query->orWhere($table . '.state_id', $stateId);
                    } else {
                        $query->where($table . '.state_id', $stateId);
                        $hasCondition = true;
                    }
                }
                if (!$hasCondition) {
                    $query->whereRaw('1 = 1');
                }
            });
            return;
        }

        // 1. Estatal (Gobernador / Admin Estatal)
        if ($user->scope_level === 'estatal') {
            if ($user->state_id && $this->hasColumn($table, 'state_id')) {
                $builder->where(function ($query) use ($table, $user) {
                    $query->where($table . '.state_id', $user->state_id);
                    if ($this->hasColumn($table, 'presidente_id')) {
                        $query->orWhere($table . '.presidente_id', $user->getPresidenteId());
                    }
                    if ($this->hasColumn($table, 'parent_id')) {
                        $query->orWhere($table . '.parent_id', $user->id);
                    }
                });
            }
        }
        // 2. Municipal (Presidente Municipal / Admin Municipal)
        elseif ($user->scope_level === 'municipal') {
            $builder->where(function ($query) use ($table, $user) {
                $hasCondition = false;
                if ($user->municipality_id && $this->hasColumn($table, 'municipality_id')) {
                    $query->where($table . '.municipality_id', $user->municipality_id);
                    $hasCondition = true;
                }
                if ($this->hasColumn($table, 'presidente_id')) {
                    $presId = $user->getPresidenteId();
                    if ($hasCondition) {
                        $query->orWhere($table . '.presidente_id', $presId);
                    } else {
                        $query->where($table . '.presidente_id', $presId);
                        $hasCondition = true;
                    }
                }
                if ($this->hasColumn($table, 'parent_id')) {
                    if ($hasCondition) {
                        $query->orWhere($table . '.parent_id', $user->id);
                    } else {
                        $query->where($table . '.parent_id', $user->id);
                        $hasCondition = true;
                    }
                }
                if (!$hasCondition) {
                    $query->whereRaw('1 = 0');
                }
            });
        }
        // 3. Demarcación (Regidor / Delegado / RD)
        elseif ($user->scope_level === 'demarcacion') {
            $targetDemarcacionId = ($user->role === UserRole::RD && $user->demarcacion_asignada_id)
                ? $user->demarcacion_asignada_id
                : $user->demarcacion_id;

            $builder->where(function ($query) use ($table, $targetDemarcacionId, $user) {
                $hasCondition = false;

                if ($targetDemarcacionId && $this->hasColumn($table, 'demarcacion_id')) {
                    $query->where($table . '.demarcacion_id', $targetDemarcacionId);
                    $hasCondition = true;
                }

                // Permitir ver registros de los que soy padre directo (ej. RDs viendo a sus operadores)
                if ($this->hasColumn($table, 'parent_id')) {
                    if ($hasCondition) {
                        $query->orWhere($table . '.parent_id', $user->id);
                    } else {
                        $query->where($table . '.parent_id', $user->id);
                        $hasCondition = true;
                    }
                }

                if (!$hasCondition) {
                    $query->whereRaw('1 = 0');
                }
            });
        }
    }

    /**
     * Checks if the table contains the specific filter column.
     */
    protected function hasColumn(string $table, string $column): bool
    {
        // Safe mapping of our main domain models and their columns
        $map = [
            'users' => ['state_id', 'municipality_id', 'demarcacion_id', 'parent_id', 'presidente_id'],
            'promovidos' => ['state_id', 'municipality_id', 'demarcacion_id', 'presidente_id'],
            'apoyos' => ['state_id', 'municipality_id', 'demarcacion_id', 'presidente_id'],
        ];

        return isset($map[$table]) && in_array($column, $map[$table]);
    }
}
