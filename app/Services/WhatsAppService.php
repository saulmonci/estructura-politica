<?php

namespace App\Services;

use App\Support\PhoneNumberNormalizer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected ?string $baseUrl;

    protected ?string $apiKey;

    protected ?string $instance;

    protected ?string $defaultGroupId;

    public function __construct()
    {
        try {
            $this->baseUrl = config('services.whatsapp.url', env('WHATSAPP_GATEWAY_URL'));
            $this->apiKey = config('services.whatsapp.key', env('WHATSAPP_API_KEY'));
            $this->instance = config('services.whatsapp.instance', env('WHATSAPP_INSTANCE', 'orion'));
            $this->defaultGroupId = config('services.whatsapp.group_id', env('WHATSAPP_WARROOM_GROUP_ID'));
        } catch (\Throwable $e) {
            $this->baseUrl = env('WHATSAPP_GATEWAY_URL');
            $this->apiKey = env('WHATSAPP_API_KEY');
            $this->instance = env('WHATSAPP_INSTANCE', 'orion');
            $this->defaultGroupId = env('WHATSAPP_WARROOM_GROUP_ID');
        }

        // Si la URL apunta a 'evolution-api' pero se ejecuta en la máquina host (sin Docker), usar 127.0.0.1
        if ($this->baseUrl && str_contains($this->baseUrl, 'evolution-api') && ! file_exists('/.dockerenv')) {
            $this->baseUrl = str_replace('evolution-api', '127.0.0.1', $this->baseUrl);
        }
    }

    /**
     * Named constructor para instanciación con credenciales explícitas (útil en pruebas).
     */
    public static function withCredentials(
        ?string $baseUrl,
        ?string $apiKey,
        ?string $instance = null,
        ?string $defaultGroupId = null
    ): self {
        $service = new self;
        $service->baseUrl = $baseUrl;
        $service->apiKey = $apiKey;
        if ($instance !== null) {
            $service->instance = $instance;
        }
        if ($defaultGroupId !== null) {
            $service->defaultGroupId = $defaultGroupId;
        }

        if ($service->baseUrl && str_contains($service->baseUrl, 'evolution-api') && ! file_exists('/.dockerenv')) {
            $service->baseUrl = str_replace('evolution-api', '127.0.0.1', $service->baseUrl);
        }

        return $service;
    }

    /**
     * Verifica si el servicio está configurado para envíos reales.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->baseUrl) && ! empty($this->apiKey);
    }

    /**
     * Envía un mensaje a un número individual o a un grupo.
     */
    public function sendMessage(string $recipient, string $text): array
    {
        // 1. Discriminación entre grupos de WhatsApp y números telefónicos individuales:
        // Los grupos terminan en '@g.us' y deben conservarse exactamente como vienen.
        // Los números individuales se normalizan al formato de Evolution API / Baileys: '52XXXXXXXXXX' (sin '+' ni prefijo móvil '1').
        $isGroup = str_ends_with($recipient, '@g.us');

        if ($isGroup) {
            $targetRecipient = $recipient;
        } else {
            $targetRecipient = PhoneNumberNormalizer::toEvolutionFormat($recipient);

            if (! $targetRecipient) {
                try {
                    Log::error("[WhatsAppService ERROR] Número de destino inválido: '{$recipient}'");
                } catch (\Throwable) {
                    // No-op: fallo en logging nunca debe interrumpir el flujo
                }

                return [
                    'success' => false,
                    'error' => 'Número de destino inválido',
                ];
            }
        }

        if (! $this->isConfigured()) {
            try {
                Log::info("[WhatsAppService MOCK] Mensaje para {$targetRecipient}:\n{$text}");
            } catch (\Throwable) {
                // Fallback silencioso si Log no está instanciado
            }

            return [
                'success' => true,
                'mock' => true,
                'message' => 'Simulación: WhatsApp Gateway no configurado en .env',
            ];
        }

        try {
            $url = rtrim($this->baseUrl, '/')."/message/sendText/{$this->instance}";

            // Formato estándar compatible con Evolution API v1 y v2 (number: 52XXXXXXXXXX o id@g.us)
            $response = Http::withHeaders([
                'apikey' => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($url, [
                'number' => $targetRecipient,
                'text' => $text,
                'textMessage' => [
                    'text' => $text,
                ],
                'delay' => 1000,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            try {
                Log::error("[WhatsAppService ERROR] Respuesta HTTP {$response->status()}: ".$response->body());
            } catch (\Throwable) {
                // No-op
            }

            return [
                'success' => false,
                'error' => $response->body(),
                'status' => $response->status(),
            ];
        } catch (\Throwable $e) {
            try {
                Log::error('[WhatsAppService EXCEPTION] '.$e->getMessage());
            } catch (\Throwable) {
                // No-op: nunca permitir que fallos de logging propaguen excepciones
            }

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Envía un mensaje al grupo de WhatsApp configurado para el War Room.
     */
    public function sendToWarRoomGroup(string $text, ?string $groupId = null): array
    {
        $targetGroup = $groupId ?: $this->defaultGroupId;

        if (empty($targetGroup)) {
            Log::warning('[WhatsAppService] No se ha definido WHATSAPP_WARROOM_GROUP_ID. Simulando salida.');

            return [
                'success' => true,
                'mock' => true,
                'message' => 'Simulación: Sin grupo de War Room configurado',
            ];
        }

        return $this->sendMessage($targetGroup, $text);
    }
}
