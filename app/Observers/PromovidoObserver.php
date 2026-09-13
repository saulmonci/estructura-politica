<?php

namespace App\Observers;

use App\Jobs\SendWhatsAppMessageJob;
use App\Models\Demarcacion;
use App\Models\Promovido;
use App\Models\WarRoomConfig;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PromovidoObserver
{
    /**
     * Se ejecuta inmediatamente tras guardar un nuevo promovido.
     */
    public function created(Promovido $promovido): void
    {
        if (! $promovido->demarcacion_id) {
            return;
        }

        // AISLAMIENTO MULTI-TENANT: Si no hay presidente_id asignado, registrar advertencia y omitir alerta.
        // Nunca compartir métricas ni llaves de caché globales entre distintas campañas electorales.
        if (empty($promovido->presidente_id)) {
            Log::warning("[PromovidoObserver] Promovido ID {$promovido->id} no tiene presidente_id asignado. Alerta de War Room omitida por seguridad multi-tenant.");

            return;
        }

        try {
            $demarcacion = Demarcacion::find($promovido->demarcacion_id);
            if (! $demarcacion) {
                return;
            }

            $meta = $demarcacion->getMetaForPresidente($promovido->presidente_id);
            if ($meta <= 0) {
                return;
            }

            // Contar total de promovidos para esta demarcación y presidente
            $total = Promovido::withoutGlobalScopes()
                ->where('demarcacion_id', $demarcacion->id)
                ->where('presidente_id', $promovido->presidente_id)
                ->count();

            // Si alcanzó o superó la meta
            if ($total >= $meta) {
                $cacheKey = "orion_pres_{$promovido->presidente_id}_dem_{$demarcacion->id}_completed_alert";

                // Alertar solo la primera vez que se alcanza la meta
                if (! Cache::has($cacheKey)) {
                    Cache::forever($cacheKey, true);

                    $mensaje = "🎉 *¡META CUMPLIDA!* Dem {$demarcacion->id} ({$demarcacion->nombre}) completada al 100% ({$total}/{$meta}).";

                    // Buscar el destino del War Room para este presidente
                    $config = WarRoomConfig::where('presidente_id', $promovido->presidente_id)->first();

                    if ($config && ! $config->alertas_meta_enabled) {
                        return;
                    }

                    $target = $config?->getTargetRecipient();

                    if ($target) {
                        SendWhatsAppMessageJob::dispatch($target, $mensaje);
                    } else {
                        $defaultGroup = config('services.whatsapp.group_id', env('WHATSAPP_WARROOM_GROUP_ID'));
                        if (! empty($defaultGroup)) {
                            SendWhatsAppMessageJob::dispatch($defaultGroup, $mensaje);
                        } else {
                            Log::warning("[PromovidoObserver] No se pudo despachar alerta de meta cumplida para Demarcación {$demarcacion->id} (Presidente: {$promovido->presidente_id}): sin destinatario configurado ni grupo por defecto.");
                        }
                    }

                    Log::info("[ORION ALERTA] Meta 100% alcanzada en Demarcación {$demarcacion->id} (Presidente: {$promovido->presidente_id})");
                }
            }
        } catch (\Throwable $e) {
            try {
                Log::error('[PromovidoObserver ERROR] '.$e->getMessage());
            } catch (\Throwable) {
                // Silencioso: fallo en logging no debe interrumpir el guardado del promovido
            }
        }
    }
}
