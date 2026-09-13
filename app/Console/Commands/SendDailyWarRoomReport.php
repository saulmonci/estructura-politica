<?php

namespace App\Console\Commands;

use App\Exceptions\UnresolvableMunicipalityException;
use App\Jobs\SendWhatsAppMessageJob;
use App\Models\WarRoomConfig;
use App\Services\WarRoomReportService;
use Illuminate\Console\Command;

class SendDailyWarRoomReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orion:send-daily-report 
                            {--dry-run : Muestra el reporte generado en consola sin enviarlo}
                            {--presidente_id= : ID del presidente específico a evaluar}
                            {--municipality_id= : ID del municipio específico a evaluar}
                            {--municipio= : Nombre opcional del municipio para el encabezado}
                            {--to= : Número de WhatsApp o ID de grupo directo para la prueba}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Genera y envía el reporte matutino (8:00 AM) al grupo de War Room en WhatsApp';

    /**
     * Execute the console command.
     */
    public function handle(WarRoomReportService $reportService): int
    {
        $explicitPresId = $this->option('presidente_id') ? (int) $this->option('presidente_id') : 0;
        $explicitMuniId = $this->option('municipality_id') ? (int) $this->option('municipality_id') : 0;
        $to = $this->option('to');
        $isDryRun = (bool) $this->option('dry-run');

        // MODO 1: Si se especificó un presidente o un destinatario específico (ej. pruebas manuales en consola)
        if ($explicitPresId > 0 || ! empty($to)) {
            $this->info('⚡ Generando Reporte Matutino ORION para campaña individual...');

            $presidenteId = $explicitPresId > 0 ? $explicitPresId : null;
            $municipalityId = $explicitMuniId > 0 ? $explicitMuniId : null;
            $municipio = $this->option('municipio');

            try {
                $mensaje = $reportService->buildDailyReportMessage($presidenteId, $municipalityId, $municipio);
            } catch (UnresolvableMunicipalityException $e) {
                $this->error('❌ [MUNICIPIO NO RESOLUBLE] '.$e->getMessage());

                return Command::FAILURE;
            }

            $this->line('');
            $this->line('--------------------------------------------------');
            $this->line($mensaje);
            $this->line('--------------------------------------------------');
            $this->line('');

            if ($isDryRun) {
                $this->warn('MODO SIMULACIÓN (--dry-run): El mensaje no fue enviado a WhatsApp.');

                return Command::SUCCESS;
            }

            if (! empty($to)) {
                $target = $to;
            } else {
                $config = WarRoomConfig::where('presidente_id', $presidenteId)->first();
                $target = $config?->getTargetRecipient() ?: config('services.whatsapp.group_id', env('WHATSAPP_WARROOM_GROUP_ID'));
            }

            if (empty($target)) {
                $this->error('❌ No se especificó destinatario ni existe grupo configurado.');

                return Command::FAILURE;
            }

            try {
                $this->info("Encolando reporte para {$target}...");
                SendWhatsAppMessageJob::dispatch($target, $mensaje);
                $this->info('✅ Reporte encolado con éxito para envío asíncrono.');

                return Command::SUCCESS;
            } catch (\Throwable $e) {
                $this->error('❌ Error al encolar reporte: '.$e->getMessage());

                return Command::FAILURE;
            }
        }

        // MODO 2: Modo multi-empresa dinámico (ejecución programada a las 8:00 AM)
        $this->info('⚡ Ejecutando despacho dinámico de War Rooms activos...');

        $configs = WarRoomConfig::where('reporte_matutino_enabled', true)
            ->with(['presidente.municipality'])
            ->get();

        if ($configs->isEmpty()) {
            $this->comment('ℹ️ No hay War Rooms vinculados en la tabla war_room_configs.');

            // Fallback: si hay configuración en .env para pruebas
            $envPres = (int) env('ORION_PRESIDENTE_ID', 0);
            $envMuni = (int) env('ORION_MUNICIPALITY_ID', 0);
            $defaultGroup = config('services.whatsapp.group_id', env('WHATSAPP_WARROOM_GROUP_ID'));
            if (($envPres > 0 || $envMuni > 0) && ! empty($defaultGroup)) {
                $this->info('Ejecutando fallback definido en .env...');
                try {
                    $mensaje = $reportService->buildDailyReportMessage($envPres ?: null, $envMuni ?: null);
                    if ($isDryRun) {
                        $this->line($mensaje);

                        return Command::SUCCESS;
                    }
                    SendWhatsAppMessageJob::dispatch($defaultGroup, $mensaje);
                    $this->info("  ✅ Encolado fallback para {$defaultGroup}");

                    return Command::SUCCESS;
                } catch (\Throwable $e) {
                    $this->error('  ❌ Error en despacho fallback: '.$e->getMessage());

                    return Command::FAILURE;
                }
            }

            return Command::SUCCESS;
        }

        $despachados = 0;
        $dispatchErrors = 0;

        foreach ($configs as $cfg) {
            $pres = $cfg->presidente;
            if (! $pres) {
                continue;
            }

            $target = $cfg->getTargetRecipient();
            if (empty($target)) {
                $this->warn("⚠️ Campaña de {$pres->name} no tiene grupo ni teléfono configurado.");
                $dispatchErrors++;

                continue;
            }

            try {
                $muniName = $pres->municipality?->nombre;
                $mensaje = $reportService->buildDailyReportMessage($pres->id, $pres->municipality_id, $muniName);

                $this->line("📋 Campaña: {$pres->name} ({$muniName}) -> Destino: {$target}");

                if ($isDryRun) {
                    $this->comment("  [SIMULACIÓN] Mensaje generado ({$pres->name}):\n".$mensaje);
                    $despachados++;

                    continue;
                }

                SendWhatsAppMessageJob::dispatch($target, $mensaje);
                $this->info("  ✅ Encolado con éxito para {$target}");
                $despachados++;
            } catch (UnresolvableMunicipalityException $e) {
                $dispatchErrors++;
                $this->error("  ❌ [MUNICIPIO NO RESOLUBLE] Campaña de {$pres->name} (ID: {$pres->id}) sin municipio asignado: ".$e->getMessage());
            } catch (\Throwable $e) {
                $dispatchErrors++;
                $this->error("  ❌ Error generando o despachando reporte para {$pres->name}: ".$e->getMessage());
            }
        }

        $this->info("🎉 Proceso finalizado. Total reportes encolados: {$despachados}. Fallas de despacho: {$dispatchErrors}");

        return $dispatchErrors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
