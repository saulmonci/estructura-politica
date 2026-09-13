<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use App\Models\WarRoomConfig;
use App\Services\WarRoomAgentService;
use App\Services\WarRoomReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WarRoomSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;

    protected Municipality $municipality;

    protected Demarcacion $demarcacion;

    protected User $presidente;

    protected User $promotor;

    protected WarRoomAgentService $agentService;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Bahía de Banderas', 'state_id' => $this->state->id]);
        $this->demarcacion = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $this->municipality->id]);

        $this->presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'telefono' => '3221234567',
        ]);

        $this->promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'presidente_id' => $this->presidente->id,
            'telefono' => '3229876543',
        ]);

        $reportServiceMock = $this->createMock(WarRoomReportService::class);

        $this->agentService = new WarRoomAgentService($reportServiceMock);
    }

    public function test_promotor_cannot_vincular_war_room(): void
    {
        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '3229876543',
            messageText: '#vincular-warroom',
            groupId: '1203630001@g.us'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('Acceso no autorizado', $response);
        $this->assertDatabaseMissing('war_room_configs', [
            'whatsapp_group_id' => '1203630001@g.us',
        ]);
    }

    public function test_presidente_can_vincular_war_room(): void
    {
        // Prueba además que la normalización de teléfono funciona con formato internacional (+521...)
        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '+5213221234567',
            messageText: '#vincular-warroom',
            groupId: '1203630001@g.us'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('WAR ROOM VINCULADO EXITOSAMENTE', $response);
        $this->assertDatabaseHas('war_room_configs', [
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '1203630001@g.us',
        ]);
    }

    public function test_promotor_cannot_desvincular_war_room(): void
    {
        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '1203630001@g.us',
            'reporte_matutino_enabled' => true,
        ]);

        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '3229876543',
            messageText: '#desvincular-warroom',
            groupId: '1203630001@g.us'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('Acceso no autorizado', $response);
        $this->assertDatabaseHas('war_room_configs', [
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '1203630001@g.us',
        ]);
    }

    public function test_presidente_can_desvincular_war_room(): void
    {
        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '1203630001@g.us',
            'reporte_matutino_enabled' => true,
        ]);

        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '3221234567',
            messageText: '#desvincular-warroom',
            groupId: '1203630001@g.us'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('desvinculado', $response);
        $this->assertDatabaseHas('war_room_configs', [
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => null,
        ]);
    }

    public function test_promotor_cannot_activar_reportes(): void
    {
        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '3229876543',
            messageText: '#activar-reportes'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('Acceso no autorizado', $response);
        $this->assertDatabaseMissing('war_room_configs', [
            'whatsapp_phone' => '3229876543',
        ]);
    }

    public function test_presidente_can_activar_reportes(): void
    {
        $response = $this->agentService->handleIncomingMessage(
            senderPhone: '3221234567',
            messageText: '#activar-reportes'
        );

        $this->assertNotNull($response);
        $this->assertStringContainsString('Reportes Personales Activados', $response);
        $this->assertDatabaseHas('war_room_configs', [
            'presidente_id' => $this->presidente->id,
            'whatsapp_phone' => '3221234567',
            'reporte_matutino_enabled' => true,
        ]);
    }
}
