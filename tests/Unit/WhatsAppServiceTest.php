<?php

namespace Tests\Unit;

use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppServiceTest extends TestCase
{
    protected WhatsAppService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Configurar credenciales de prueba para que isConfigured() retorne true
        Config::set('services.whatsapp.url', 'http://evolution-api:8080');
        Config::set('services.whatsapp.key', 'test-api-key');
        Config::set('services.whatsapp.instance', 'test-instance');
        Config::set('services.whatsapp.group_id', '120363default@g.us');

        $this->service = new WhatsAppService;
    }

    public function test_normalizes_mexican_phone_with_521_to_evolution_format_52(): void
    {
        Http::fake([
            '*/message/sendText/*' => Http::response(['status' => 'success'], 200),
        ]);

        $result = $this->service->sendMessage('+5213221234567', 'Hola');

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return $request['number'] === '523221234567'
                && $request['text'] === 'Hola';
        });
    }

    public function test_group_id_ending_with_g_us_is_not_altered(): void
    {
        Http::fake([
            '*/message/sendText/*' => Http::response(['status' => 'success'], 200),
        ]);

        $groupId = '120363023456789@g.us';
        $result = $this->service->sendMessage($groupId, 'Alerta en grupo');

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return $request['number'] === '120363023456789@g.us'
                && $request['text'] === 'Alerta en grupo';
        });
    }

    public function test_invalid_phone_number_does_not_send_http_request_and_returns_error(): void
    {
        Http::fake();

        $result = $this->service->sendMessage('12345', 'Texto de prueba');

        Http::assertNothingSent();

        $this->assertFalse($result['success']);
        $this->assertEquals('Número de destino inválido', $result['error']);
    }

    public function test_send_to_war_room_group_delegates_to_send_message_properly(): void
    {
        Http::fake([
            '*/message/sendText/*' => Http::response(['status' => 'success'], 200),
        ]);

        $result = $this->service->sendToWarRoomGroup('Reporte general', '120363custom@g.us');

        $this->assertTrue($result['success']);

        Http::assertSent(function ($request) {
            return $request['number'] === '120363custom@g.us';
        });
    }

    public function test_container_resolution_respects_configuration(): void
    {
        Config::set('services.whatsapp.url', 'http://fake-evolution:8080');
        Config::set('services.whatsapp.key', 'fake-key');

        $service = app(WhatsAppService::class);

        $this->assertTrue($service->isConfigured());
    }

    public function test_with_credentials_named_constructor_creates_instance_correctly(): void
    {
        $service = WhatsAppService::withCredentials('http://custom-host:8080', 'custom-key', 'custom-instance', 'custom@g.us');

        $this->assertTrue($service->isConfigured());

        $unconfigured = WhatsAppService::withCredentials(null, null);
        $this->assertFalse($unconfigured->isConfigured());
    }
}
