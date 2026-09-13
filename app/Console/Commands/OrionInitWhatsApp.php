<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class OrionInitWhatsApp extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orion:init-whatsapp';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Crea la instancia en Evolution API y muestra el enlace del código QR para vincular WhatsApp';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $gatewayUrl = config('services.whatsapp.url', env('WHATSAPP_GATEWAY_URL', 'http://evolution-api:8080'));
        $apiKey = config('services.whatsapp.key', env('WHATSAPP_API_KEY', 'orion_secret_key_123'));
        $instance = config('services.whatsapp.instance', env('WHATSAPP_INSTANCE', 'orion'));

        // Si se ejecuta en el host
        if (str_contains($gatewayUrl, 'evolution-api') && ! file_exists('/.dockerenv')) {
            $gatewayUrl = str_replace('evolution-api', '127.0.0.1', $gatewayUrl);
        }

        $this->info("⚡ Conectando con Evolution API en {$gatewayUrl}...");

        $endpoint = rtrim($gatewayUrl, '/').'/instance/create';

        try {
            $response = Http::withHeaders([
                'apikey' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post($endpoint, [
                'instanceName' => $instance,
                'token' => $apiKey,
                'qrcode' => true,
                'integration' => 'WHATSAPP-BAILEYS',
                'webhook' => [
                    'url' => 'http://laravel.test/api/v1/whatsapp/webhook',
                    'byEvents' => true,
                    'events' => ['MESSAGES_UPSERT'],
                ],
            ]);

            if ($response->successful() || $response->status() === 403 || str_contains($response->body(), 'already in use')) {
                $this->info("✅ Instancia '{$instance}' lista en Evolution API.");
            } else {
                $this->warn('Aviso al crear instancia: '.$response->body());
            }

            // Consultar estado de conexión
            $connectUrl = rtrim($gatewayUrl, '/')."/instance/connect/{$instance}";
            $connectResponse = Http::withHeaders(['apikey' => $apiKey])->get($connectUrl);

            $this->line('');
            $this->line('==================================================');
            $this->info('📲 VINCULA TU WHATSAPP ESCANEANDO EL CÓDIGO QR');
            $this->line('==================================================');
            $this->line('Abre esta URL en tu navegador para ver y escanear el QR:');
            $this->comment("👉 http://localhost:8080/instance/connect/{$instance}");
            $this->line('==================================================');
            $this->line('');

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('❌ No se pudo conectar con Evolution API: '.$e->getMessage());
            $this->line('Asegúrate de haber ejecutado: sail up -d');

            return Command::FAILURE;
        }
    }
}
