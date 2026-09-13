<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class OrionListGroups extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orion:groups';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Muestra los grupos de WhatsApp donde está agregado el Agente ORION con sus IDs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $gatewayUrl = config('services.whatsapp.url', env('WHATSAPP_GATEWAY_URL', 'http://evolution-api:8080'));
        $apiKey = config('services.whatsapp.key', env('WHATSAPP_API_KEY', 'orion_secret_key_123'));
        $instance = config('services.whatsapp.instance', env('WHATSAPP_INSTANCE', 'orion'));

        if (str_contains($gatewayUrl, 'evolution-api') && ! file_exists('/.dockerenv')) {
            $gatewayUrl = str_replace('evolution-api', '127.0.0.1', $gatewayUrl);
        }

        $this->info("⚡ Consultando grupos de WhatsApp en la instancia '{$instance}'...");

        try {
            $response = Http::withHeaders(['apikey' => $apiKey])
                ->timeout(45)
                ->get(rtrim($gatewayUrl, '/')."/group/fetchAllGroups/{$instance}?getParticipants=false");

            $groups = $response->json();

            if (! is_array($groups) || empty($groups)) {
                $this->warn('No se encontraron grupos o WhatsApp aún se está sincronizando.');

                return Command::SUCCESS;
            }

            $tableData = [];
            foreach ($groups as $g) {
                $tableData[] = [
                    'id' => $g['id'] ?? 'Sin ID',
                    'nombre' => $g['subject'] ?? 'Sin nombre',
                ];
            }

            $this->table(['Group ID (para .env)', 'Nombre del Grupo'], $tableData);
            $this->line('');
            $this->info("Copia el 'Group ID' del grupo que quieras y ponlo en tu .env en WHATSAPP_WARROOM_GROUP_ID=");

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error al consultar grupos: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
