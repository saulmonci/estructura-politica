<?php

namespace App\Jobs;

use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número máximo de intentos antes de fallar definitivamente.
     */
    public int $tries = 3;

    public string $recipient;

    public string $text;

    public function __construct(string $recipient, string $text)
    {
        $this->recipient = $recipient;
        $this->text = $text;
    }

    /**
     * Tiempos de espera (en segundos) entre reintentos fallidos.
     */
    public function backoff(): array
    {
        return [10, 30, 60];
    }

    /**
     * Ejecuta el trabajo de envío de mensaje de WhatsApp.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        $result = $whatsAppService->sendMessage($this->recipient, $this->text);

        if (! ($result['success'] ?? false)) {
            $errorMessage = $result['error'] ?? 'Error desconocido al enviar WhatsApp';

            // Si el número es inválido, cancelar de inmediato sin reintentar
            if ($errorMessage === 'Número de destino inválido') {
                try {
                    Log::warning("[SendWhatsAppMessageJob] Descartado: número inválido para {$this->recipient}");
                } catch (\Throwable) {
                    // No-op: fallo en logging nunca interrumpe el flujo
                }

                return;
            }

            throw new \RuntimeException("Fallo en envío de WhatsApp a {$this->recipient}: {$errorMessage}");
        }
    }

    /**
     * Maneja el fallo terminal una vez agotados todos los reintentos.
     */
    public function failed(?\Throwable $exception): void
    {
        try {
            Log::error("[SendWhatsAppMessageJob FAILED] Agotados los {$this->tries} reintentos para {$this->recipient}: ".$exception?->getMessage());
        } catch (\Throwable) {
            // No-op: blindaje de logging
        }
    }
}
