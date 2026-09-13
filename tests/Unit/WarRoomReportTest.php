<?php

namespace Tests\Unit;

use App\Exceptions\UnresolvableMunicipalityException;
use App\Jobs\SendWhatsAppMessageJob;
use App\Services\WarRoomAgentService;
use App\Services\WarRoomReportService;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class WarRoomReportTest extends TestCase
{
    public function test_whatsapp_service_handles_unconfigured_gateway_safely(): void
    {
        $service = WhatsAppService::withCredentials(null, null);
        $this->assertFalse($service->isConfigured());

        $result = $service->sendMessage('5213221234567', 'Test');
        $this->assertTrue($result['success']);
        $this->assertTrue($result['mock']);
    }

    public function test_agent_matches_reporte_demarcacion_regex(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('getDemarcacionReport')
            ->with('1', 1)
            ->willReturn('Dem 1: 50% - Te faltan 1');

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: 'Reporte Dem 1',
            groupId: '120363@g.us',
            forcePresidenteId: 1
        );

        $this->assertEquals('Dem 1: 50% - Te faltan 1', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '120363@g.us'
                && $job->text === 'Dem 1: 50% - Te faltan 1';
        });
    }

    public function test_agent_matches_quien_no_ha_capturado_regex(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('getInactiveTodaySummary')
            ->with(1)
            ->willReturn('RD 7, RD 4 y RD 9 sin captura hoy');

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: '¿Quién no ha capturado hoy?',
            forcePresidenteId: 1
        );

        $this->assertEquals('RD 7, RD 4 y RD 9 sin captura hoy', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '5213221234567'
                && $job->text === 'RD 7, RD 4 y RD 9 sin captura hoy';
        });
    }

    public function test_agent_matches_reporte_del_dia_regex(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('buildDailyReportMessage')
            ->with(1)
            ->willReturn('🚨 REPORTE ORION');

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: 'Reporte del día',
            forcePresidenteId: 1
        );

        $this->assertEquals('🚨 REPORTE ORION', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '5213221234567'
                && $job->text === '🚨 REPORTE ORION';
        });
    }

    public function test_agent_handles_group_mentions_and_variations(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('getDemarcacionReport')
            ->with('7', 1)
            ->willReturn('Dem 7: 0% - 3 días sin captura');

        $agent = new WarRoomAgentService($reportServiceMock);

        // Prueba con mención en grupo: "@ORION Reporte Demarcación 7"
        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: '@ORION Reporte Demarcación 7',
            groupId: '120363@g.us',
            forcePresidenteId: 1
        );

        $this->assertEquals('Dem 7: 0% - 3 días sin captura', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '120363@g.us'
                && $job->text === 'Dem 7: 0% - 3 días sin captura';
        });
    }

    public function test_agent_returns_help_when_explicitly_requested(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: 'ayuda',
            forcePresidenteId: 1
        );

        $this->assertStringContainsString('Comandos disponibles', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '5213221234567'
                && str_contains($job->text, 'Agente ORION - Comandos disponibles');
        });
    }

    public function test_agent_ignores_unregistered_contacts_or_chat_without_command(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);

        $agent = new WarRoomAgentService($reportServiceMock);

        // Sin presidente/campaña resuelta -> debe retornar null y no enviar mensajes
        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: 'Hola cómo estás'
        );

        $this->assertNull($response);

        Queue::assertNothingPushed();
    }

    public function test_resolve_municipality_id_uses_explicit_parameter_first(): void
    {
        $service = new WarRoomReportService;
        $this->assertEquals(999, $service->resolveMunicipalityId(null, 999));
    }

    public function test_resolve_municipality_id_throws_unresolvable_municipality_exception_when_no_source_available(): void
    {
        $prevMuni = $_ENV['ORION_MUNICIPALITY_ID'] ?? null;
        $prevPres = $_ENV['ORION_PRESIDENTE_ID'] ?? null;
        unset($_ENV['ORION_MUNICIPALITY_ID'], $_SERVER['ORION_MUNICIPALITY_ID']);
        unset($_ENV['ORION_PRESIDENTE_ID'], $_SERVER['ORION_PRESIDENTE_ID']);
        putenv('ORION_MUNICIPALITY_ID');
        putenv('ORION_PRESIDENTE_ID');

        try {
            $service = new WarRoomReportService;
            $this->expectException(UnresolvableMunicipalityException::class);
            $service->resolveMunicipalityId(null, null);
        } finally {
            if ($prevMuni !== null) {
                $_ENV['ORION_MUNICIPALITY_ID'] = $prevMuni;
                putenv("ORION_MUNICIPALITY_ID={$prevMuni}");
            }
            if ($prevPres !== null) {
                $_ENV['ORION_PRESIDENTE_ID'] = $prevPres;
                putenv("ORION_PRESIDENTE_ID={$prevPres}");
            }
        }
    }

    public function test_agent_handles_unresolvable_municipality_exception_gracefully(): void
    {
        Queue::fake();

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('getDemarcacionReport')
            ->willThrowException(new UnresolvableMunicipalityException('No se pudo determinar el municipio'));

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: 'Reporte Dem 1',
            forcePresidenteId: 1
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('no se pudo determinar el municipio asignado a tu campaña', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '5213221234567'
                && str_contains($job->text, 'no se pudo determinar el municipio asignado a tu campaña');
        });
    }

    public function test_gemini_agent_propagates_unresolvable_municipality_exception_to_caller(): void
    {
        Queue::fake();
        Log::spy();

        config(['services.gemini.key' => 'fake-api-key']);

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'functionCall' => [
                                        'name' => 'obtener_reporte_demarcacion',
                                        'args' => [
                                            'demarcacion' => '3',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $reportServiceMock->expects($this->once())
            ->method('getDemarcacionReport')
            ->with('3', 1)
            ->willThrowException(new UnresolvableMunicipalityException('No se pudo determinar el municipio'));

        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: '¿Cómo vamos en la demarcación 3?',
            forcePresidenteId: 1
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('no se pudo determinar el municipio asignado a tu campaña', $response);

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '5213221234567'
                && str_contains($job->text, 'no se pudo determinar el municipio asignado a tu campaña');
        });

        // Asegurar que el catch genérico de Gemini NO se ejecutó para este caso
        Log::shouldNotHaveReceived('error', [
            Mockery::on(fn ($msg) => is_string($msg) && str_contains($msg, '[Gemini Agent EXCEPTION]')),
        ]);
    }

    public function test_gemini_agent_catches_generic_exceptions_silently_and_returns_null(): void
    {
        Queue::fake();
        Log::spy();

        config(['services.gemini.key' => 'fake-api-key']);

        Http::fake([
            'generativelanguage.googleapis.com/*' => function () {
                throw new \RuntimeException('Simulated network timeout');
            },
        ]);

        $reportServiceMock = $this->createMock(WarRoomReportService::class);
        $agent = new WarRoomAgentService($reportServiceMock);

        $response = $agent->handleIncomingMessage(
            senderPhone: '5213221234567',
            messageText: '¿Cuál es la estrategia para hoy?',
            forcePresidenteId: 1
        );

        // Fallo genérico de red: no relanza y devuelve null
        $this->assertNull($response);
        Queue::assertNothingPushed();

        // Se verifica que para errores genéricos sí se registra [Gemini Agent EXCEPTION]
        Log::shouldHaveReceived('error')
            ->with(Mockery::on(fn ($msg) => is_string($msg) && str_contains($msg, '[Gemini Agent EXCEPTION]')));
    }
}
