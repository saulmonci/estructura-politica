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

        // 1. Estatal (Gobernador / Admin Estatal)
        if ($user->scope_level === 'estatal') {
            if ($user->state_id && $this->hasColumn($table, 'state_id')) {
                $builder->where($table . '.state_id', $user->state_id);
            }
        }
        // 2. Municipal (Presidente Municipal / Admin Municipal)
        elseif ($user->scope_level === 'municipal') {
            if ($user->municipality_id && $this->hasColumn($table, 'municipality_id')) {
                $builder->where($table . '.municipality_id', $user->municipality_id);
            }
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
            'users' => ['state_id', 'municipality_id', 'demarcacion_id', 'parent_id'],
            'promovidos' => ['state_id', 'municipality_id', 'demarcacion_id'],
            'apoyos' => ['state_id', 'municipality_id', 'demarcacion_id'],
        ];

        return isset($map[$table]) && in_array($column, $map[$table]);
    }
}
