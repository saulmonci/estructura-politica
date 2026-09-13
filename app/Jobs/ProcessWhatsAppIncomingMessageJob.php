<?php

namespace App\Jobs;

use App\Services\WarRoomAgentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessWhatsAppIncomingMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número máximo de intentos antes de fallar definitivamente.
     */
    public int $tries = 3;

    public string $senderPhone;

    public string $messageText;

    public ?string $groupId;

    public ?string $senderName;

    public function __construct(
        string $senderPhone,
        string $messageText,
        ?string $groupId = null,
        ?string $senderName = null
    ) {
        $this->senderPhone = $senderPhone;
        $this->messageText = $messageText;
        $this->groupId = $groupId;
        $this->senderName = $senderName;
    }

    /**
     * Tiempos de espera (en segundos) entre reintentos.
     */
    public function backoff(): array
    {
        return [5, 15, 30];
    }

    /**
     * Procesa el mensaje entrante utilizando el Agente ORION.
     */
    public function handle(WarRoomAgentService $agentService): void
    {
        $agentService->handleIncomingMessage(
            senderPhone: $this->senderPhone,
            messageText: $this->messageText,
            groupId: $this->groupId,
            senderName: $this->senderName
        );
    }

    /**
     * Maneja el fallo terminal una vez agotados todos los reintentos.
     */
    public function failed(?\Throwable $exception): void
    {
        try {
            Log::error("[ProcessWhatsAppIncomingMessageJob FAILED] Error procesando mensaje de {$this->senderPhone}: ".$exception?->getMessage());
        } catch (\Throwable) {
            // No-op: blindaje de logging
        }
    }
}
