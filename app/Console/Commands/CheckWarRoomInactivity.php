<?php

namespace App\Console\Commands;

use App\Exceptions\UnresolvableMunicipalityException;
use App\Jobs\SendWhatsAppMessageJob;
use App\Models\WarRoomConfig;
use App\Services\WarRoomReportService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CheckWarRoomInactivity extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orion:check-inactivity 
                            {--dry-run : Muestra las alertas en consola sin enviarlas}
                            {--presidente_id= : ID del presidente específico a evaluar}
                            {--municipality_id= : ID del municipio específico a evaluar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica si alguna demarcación lleva más de 24h sin actividad y alerta al grupo';

    /**
     * Execute the console command.
     */
    public function handle(WarRoomReportService $reportService): int
    {
        $explicitPresId = $this->option('presidente_id') ? (int) $this->option('presidente_id') : 0;
        $explicitMuniId = $this->option('municipality_id') ? (int) $this->option('municipality_id') : 0;
        $isDryRun = (bool) $this->option('dry-run');
        $hoy = Carbon::today()->format('Y-m-d');

        // MODO 1: Si se especificó un presidente o municipio específico
        if ($explicitPresId > 0 || $explicitMuniId > 0) {
            $presidenteId = $explicitPresId > 0 ? $explicitPresId : null;
            $municipalityId = $explicitMuniId > 0 ? $explicitMuniId : null;

            try {
                $alertas = $reportService->checkInactivityAlerts($presidenteId, $municipalityId);
            } catch (UnresolvableMunicipalityException $e) {
                $this->error('❌ [MUNICIPIO NO RESOLUBLE] '.$e->getMessage());

                return Command::FAILURE;
            }

            if (empty($alertas)) {
                $this->info('✅ Todas las demarcaciones presentan actividad o han completado sus metas.');

                return Command::SUCCESS;
            }

            $this->warn('⚠️ Se detectaron '.count($alertas).' demarcaciones inactivas.');

            $config = $presidenteId ? WarRoomConfig::where('presidente_id', $presidenteId)->first() : null;
            $target = $config?->getTargetRecipient() ?: config('services.whatsapp.group_id', env('WHATSAPP_WARROOM_GROUP_ID'));

            $dispatchErrors = 0;

            foreach ($alertas as $alerta) {
                $presPrefix = $presidenteId ? "pres_{$presidenteId}_" : '';
                $cacheKey = "orion_inactivity_{$presPrefix}dem_{$alerta['demarcacion_id']}_{$hoy}";

                $this->line('• '.$alerta['mensaje']);

                if ($isDryRun) {
                    $this->comment('  [SIMULACIÓN] No se despachó a WhatsApp.');

                    continue;
                }

                if (Cache::has($cacheKey)) {
                    $this->comment("  [OMITIDO] Ya se alertó hoy sobre la Demarcación {$alerta['demarcacion_id']}.");

                    continue;
                }

                if (empty($target)) {
                    $this->error('  [FALLO] No hay destinatario ni grupo configurado para despachar la alerta.');
                    $dispatchErrors++;

                    continue;
                }

                try {
                    SendWhatsAppMessageJob::dispatch($target, $alerta['mensaje']);
                    // Estrategia (a): fijar cache key inmediatamente al encolar para evitar spam/duplicados si el comando se re-ejecuta
                    Cache::put($cacheKey, true, now()->addHours(18));
                    $this->info("  [ENCOLADO] Alerta encolada para {$target}.");
                } catch (\Throwable $e) {
                    $this->error('  [FALLO] No se pudo encolar alerta: '.$e->getMessage());
                    $dispatchErrors++;
                }
            }

            return $dispatchErrors > 0 ? Command::FAILURE : Command::SUCCESS;
        }

        // MODO 2: Multi-empresa dinámico sobre todos los War Rooms activos
        $configs = WarRoomConfig::where('alertas_inactividad_enabled', true)
            ->with(['presidente.municipality'])
            ->get();

        if ($configs->isEmpty()) {
            $this->comment('ℹ️ No hay War Rooms activos para verificación de inactividad.');

            return Command::SUCCESS;
        }

        $dispatchErrors = 0;

        foreach ($configs as $cfg) {
            $pres = $cfg->presidente;
            if (! $pres) {
                continue;
            }

            $target = $cfg->getTargetRecipient();
            if (empty($target)) {
                continue;
            }

            try {
                $alertas = $reportService->checkInactivityAlerts($pres->id, $pres->municipality_id);
            } catch (UnresolvableMunicipalityException $e) {
                $dispatchErrors++;
                $this->error("⚠️ [MUNICIPIO NO RESOLUBLE] Campaña de {$pres->name} (ID: {$pres->id}) sin municipio asignado: ".$e->getMessage());

                continue;
            }

            if (empty($alertas)) {
                continue;
            }

            $this->warn("⚠️ {$pres->name}: ".count($alertas).' demarcaciones inactivas.');

            foreach ($alertas as $alerta) {
                $cacheKey = "orion_inactivity_pres_{$pres->id}_dem_{$alerta['demarcacion_id']}_{$hoy}";

                $this->line("• [{$pres->name}] {$alerta['mensaje']}");

                if ($isDryRun) {
                    $this->comment('  [SIMULACIÓN] No se despachó.');

                    continue;
                }

                if (Cache::has($cacheKey)) {
                    $this->comment("  [OMITIDO] Ya alertado hoy para Demarcación {$alerta['demarcacion_id']}.");

                    continue;
                }

                try {
                    SendWhatsAppMessageJob::dispatch($target, $alerta['mensaje']);
                    // Estrategia (a): fijar cache key inmediatamente al encolar
                    Cache::put($cacheKey, true, now()->addHours(18));
                    $this->info("  [ENCOLADO] Alerta encolada para {$target}.");
                } catch (\Throwable $e) {
                    $this->error('  [FALLO] No se pudo encolar alerta: '.$e->getMessage());
                    $dispatchErrors++;
                }
            }
        }

        return $dispatchErrors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
