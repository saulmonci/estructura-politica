<?php

namespace App\Traits;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait LogsGeomUpload
{
    /**
     * Registra manualmente en activity_logs la carga de geometría de un modelo.
     *
     * Se hace a mano (en vez de dejar que LogsActivity la capture) porque la escritura de
     * `geom` se hace vía DB::statement() crudo (bypaseando Eloquent) para poder usar
     * funciones PostGIS con bindings parametrizados — LogsActivity nunca ve ese cambio.
     */
    protected function logGeomUpload($model, string $geometryType): void
    {
        try {
            $user = Auth::user();
            $userIdentifier = 'Sistema / Semilla';

            if ($user) {
                $fullName = trim(($user->nombre ?? '').' '.($user->apellidos ?? ''));
                if (empty($fullName)) {
                    $fullName = $user->name ?? '';
                }
                $userRoleStr = $user->role instanceof UserRole ? $user->role->value : ($user->role ?? '');
                $userIdentifier = sprintf('%s - %s (%s)', $user->id, $fullName, $userRoleStr);
            }

            ActivityLog::create([
                'user_id' => $user?->id,
                'user_identifier' => $userIdentifier,
                'action' => 'updated',
                'model_type' => get_class($model),
                'model_friendly_name' => class_basename($model),
                'model_id' => $model->getKey(),
                'model_representation' => $model->nombre ?? $model->numero ?? $model->getKey(),
                'original_data' => null,
                'changed_data' => ['geom' => "Geometría cargada ({$geometryType})"],
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'presidente_id' => $user?->getPresidenteId(),
            ]);
        } catch (\Throwable $e) {
            logger()->error('Error logging geom upload activity: '.$e->getMessage(), ['exception' => $e]);
        }
    }
}
