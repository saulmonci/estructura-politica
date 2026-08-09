<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsActivity
{
    /**
     * Temporary property to store diff during update events.
     */
    public $_activity_log_diff;

    /**
     * Boot the trait to attach to Eloquent events.
     */
    protected static function bootLogsActivity()
    {
        static::created(function ($model) {
            static::logActivity($model, 'created', null, $model->getLoggableAttributes());
        });

        static::updating(function ($model) {
            $dirty = $model->getDirty();
            $original = [];
            $changed = [];
            $hidden = $model->getHidden();

            foreach ($dirty as $key => $value) {
                // Ignore timestamp updates and passwords/tokens
                if (in_array($key, ['updated_at', 'created_at', 'remember_token'])) {
                    continue;
                }
                if (in_array($key, $hidden)) {
                    continue;
                }

                $origVal = $model->getOriginal($key);

                // Check if they are actually different (to avoid logging false positives)
                if ($origVal !== $value) {
                    $original[$key] = $origVal;
                    $changed[$key] = $value;
                }
            }

            if (!empty($changed)) {
                $model->_activity_log_diff = [
                    'original' => $original,
                    'changed' => $changed,
                ];
            }
        });

        static::updated(function ($model) {
            if (isset($model->_activity_log_diff)) {
                static::logActivity(
                    $model,
                    'updated',
                    $model->_activity_log_diff['original'],
                    $model->_activity_log_diff['changed']
                );
            }
        });

        static::deleted(function ($model) {
            static::logActivity($model, 'deleted', $model->getLoggableAttributes(), null);
        });
    }

    /**
     * Get attributes excluding hidden fields and system timestamps.
     */
    protected function getLoggableAttributes(): array
    {
        $attributes = $this->getAttributes();
        $hidden = $this->getHidden();

        return array_filter($attributes, function ($value, $key) use ($hidden) {
            return !in_array($key, $hidden) && !in_array($key, ['updated_at', 'created_at', 'remember_token']);
        }, ARRAY_FILTER_USE_BOTH);
    }

    /**
     * Create the log entry in database.
     */
    protected static function logActivity($model, string $action, ?array $original, ?array $changed)
    {
        try {
            $user = Auth::user();
            $userIdentifier = null;

            if ($user) {
                $fullName = trim(($user->nombre ?? '') . ' ' . ($user->apellidos ?? ''));
                if (empty($fullName)) {
                    $fullName = $user->name ?? '';
                }
                $userRoleStr = $user->role instanceof \App\Enums\UserRole ? $user->role->value : ($user->role ?? '');
                $userIdentifier = sprintf('%s - %s (%s)', $user->id, $fullName, $userRoleStr);
            } else {
                $userIdentifier = 'Sistema / Semilla';
            }

            $modelClass = get_class($model);
            $modelFriendlyName = class_basename($modelClass);

            // Find a descriptive representation for the model instance
            $modelRepresentation = null;
            if (method_exists($model, 'toRepresentation')) {
                $modelRepresentation = $model->toRepresentation();
            } else {
                foreach (['nombre_completo', 'nombre', 'name', 'numero', 'id'] as $attr) {
                    if (!empty($model->{$attr})) {
                        $modelRepresentation = $model->{$attr};
                        break;
                    }
                }
            }

            if (empty($modelRepresentation)) {
                $modelRepresentation = $model->getKey();
            }

            $presidenteId = null;
            if ($user) {
                $presidenteId = $user->getPresidenteId();
            } elseif ($model) {
                if (isset($model->presidente_id)) {
                    $presidenteId = $model->presidente_id;
                } elseif (get_class($model) === \App\Models\User::class && ($model->role === \App\Enums\UserRole::PRESIDENTE || $model->role === 'presidente')) {
                    $presidenteId = $model->id;
                }
            }

            $normalizeData = function (?array $data) {
                if (!$data) return $data;
                return array_map(function ($val) {
                    return $val instanceof \BackedEnum ? $val->value : $val;
                }, $data);
            };

            ActivityLog::create([
                'user_id' => $user?->id,
                'user_identifier' => $userIdentifier,
                'action' => $action,
                'model_type' => $modelClass,
                'model_friendly_name' => $modelFriendlyName,
                'model_id' => $model->getKey(),
                'model_representation' => $modelRepresentation,
                'original_data' => $normalizeData($original),
                'changed_data' => $normalizeData($changed),
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'presidente_id' => $presidenteId,
            ]);
        } catch (\Exception $e) {
            // Log to laravel log files so it doesn't interrupt standard flow
            logger()->error('Error logging system activity: ' . $e->getMessage(), [
                'exception' => $e
            ]);
        }
    }
}
