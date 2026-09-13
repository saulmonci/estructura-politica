<?php

namespace Tests\Unit;

use App\Jobs\ProcessWhatsAppIncomingMessageJob;
use App\Jobs\SendWhatsAppMessageJob;
use App\Services\WarRoomAgentService;
use App\Services\WarRoomReportService;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WarRoomJobsTest extends TestCase
{
    public function test_send_whatsapp_message_job_executes_successfully(): void
    {
        $whatsAppMock = $this->createMock(WhatsAppService::class);
        $whatsAppMock->expects($this->once())
            ->method('sendMessage')
            ->with('523221234567', 'Reporte listo')
            ->willReturn(['success' => true]);

        $job = new SendWhatsAppMessageJob('523221234567', 'Reporte listo');
        $job->handle($whatsAppMock);
    }

    public function test_send_whatsapp_message_job_throws_runtime_exception_on_failure_for_retry(): void
    {
        $whatsAppMock = $this->createMock(WhatsAppService::class);
        $whatsAppMock->expects($this->once())
            ->method('sendMessage')
            ->with('523221234567', 'Reporte listo')
            ->willReturn(['success' => false, 'error' => 'Connection timeout']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Connection timeout');

        $job = new SendWhatsAppMessageJob('523221234567', 'Reporte listo');
        $job->handle($whatsAppMock);
    }

    public function test_send_whatsapp_message_job_discards_invalid_phone_without_retry(): void
    {
        Log::spy();

        $whatsAppMock = $this->createMock(WhatsAppService::class);
        $whatsAppMock->expects($this->once())
            ->method('sendMessage')
            ->with('12345', 'Reporte')
            ->willReturn(['success' => false, 'error' => 'Número de destino inválido']);

        $job = new SendWhatsAppMessageJob('12345', 'Reporte');
        $job->handle($whatsAppMock);

        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function ($msg) {
                return str_contains($msg, '[SendWhatsAppMessageJob] Descartado: número inválido para 12345');
            });
    }

    public function test_send_whatsapp_message_job_accepts_group_jid(): void
    {
        $whatsAppMock = $this->createMock(WhatsAppService::class);
        $whatsAppMock->expects($this->once())
            ->method('sendMessage')
            ->with('120363023456789@g.us', 'Alerta grupal')
            ->willReturn(['success' => true]);

        $job = new SendWhatsAppMessageJob('120363023456789@g.us', 'Alerta grupal');
        $job->handle($whatsAppMock);
    }

    public function test_send_whatsapp_message_job_has_three_tries_and_correct_backoff(): void
    {
        $job = new SendWhatsAppMessageJob('523221234567', 'Texto');

        $this->assertEquals(3, $job->tries);
        $this->assertEquals([10, 30, 60], $job->backoff());
    }

    public function test_send_whatsapp_message_job_failed_logs_error(): void
    {
        Log::spy();

        $job = new SendWhatsAppMessageJob('523221234567', 'Texto');
        $job->failed(new \RuntimeException('Evolution API inalcanzable'));

        Log::shouldHaveReceived('error')
            ->once()
            ->withArgs(function ($msg) {
                return str_contains($msg, 'SendWhatsAppMessageJob FAILED')
                    && str_contains($msg, '523221234567');
            });
    }

    public function test_process_whatsapp_incoming_message_job_delegates_to_agent_service(): void
    {
        $agentMock = $this->createMock(WarRoomAgentService::class);
        $agentMock->expects($this->once())
            ->method('handleIncomingMessage')
            ->with('523221234567', '¿Cómo vamos?', 'group123@g.us', 'Juan')
            ->willReturn('Respuesta del agente');

        $job = new ProcessWhatsAppIncomingMessageJob('523221234567', '¿Cómo vamos?', 'group123@g.us', 'Juan');
        $job->handle($agentMock);
    }

    public function test_process_whatsapp_incoming_message_job_has_three_tries_and_correct_backoff(): void
    {
        $job = new ProcessWhatsAppIncomingMessageJob('523221234567', 'Hola');

        $this->assertEquals(3, $job->tries);
        $this->assertEquals([5, 15, 30], $job->backoff());
    }

    public function test_process_whatsapp_incoming_message_job_failed_logs_error(): void
    {
        Log::spy();

        $job = new ProcessWhatsAppIncomingMessageJob('523221234567', 'Hola');
        $job->failed(new \RuntimeException('Gemini API quota exceeded'));

        Log::shouldHaveReceived('error')
            ->once()
            ->withArgs(function ($msg) {
                return str_contains($msg, 'ProcessWhatsAppIncomingMessageJob FAILED')
                    && str_contains($msg, '523221234567');
            });
    }

    public function test_interactive_agent_reply_dispatches_send_whatsapp_message_job(): void
    {
        Queue::fake();

        $reportMock = $this->createMock(WarRoomReportService::class);
        $reportMock->expects($this->once())
            ->method('getDemarcacionReport')
            ->with('1', 1)
            ->willReturn('Dem 1: 75% - Te faltan 5');

        $agent = new WarRoomAgentService($reportMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '523221234567',
            messageText: 'Reporte Dem 1',
            groupId: '1203639999@g.us',
            forcePresidenteId: 1
        );

        $this->assertEquals('Dem 1: 75% - Te faltan 5', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '1203639999@g.us'
                && $job->text === 'Dem 1: 75% - Te faltan 5';
        });
    }
}
