<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\State;
use App\Models\User;
use App\Models\WarRoomConfig;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PromovidoObserverSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;

    protected Municipality $municipality;

    protected Demarcacion $demarcacion;

    protected User $presidente;

    protected User $promotorConPresidente;

    protected User $promotorSinPresidente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Bahía de Banderas', 'state_id' => $this->state->id]);
        $this->demarcacion = Demarcacion::create([
            'nombre' => 'Demarcación 1',
            'municipality_id' => $this->municipality->id,
            'meta' => 1,
        ]);

        $this->presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'telefono' => '3221234567',
        ]);

        $this->promotorConPresidente = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'presidente_id' => $this->presidente->id,
            'telefono' => '3229876543',
        ]);

        $this->promotorSinPresidente = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'presidente_id' => null,
            'telefono' => '3229998877',
        ]);
    }

    public function test_promovido_without_presidente_id_omits_alert_and_logs_warning(): void
    {
        Log::spy();

        // Crear promovido con promotor que no tiene presidente asignado
        $promovido = Promovido::create([
            'nombre' => 'Juan',
            'apellidos' => 'Pérez López',
            'promotor_id' => $this->promotorSinPresidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'municipality_id' => $this->municipality->id,
            'state_id' => $this->state->id,
            'presidente_id' => null,
        ]);

        $this->assertNull($promovido->presidente_id);

        // Verificar que no se creó ninguna clave de caché global
        $globalKey = "orion_dem_{$this->demarcacion->id}_completed_alert";
        $this->assertFalse(Cache::has($globalKey));

        // Verificar que se registró la advertencia en el log
        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function ($message) use ($promovido) {
                return str_contains($message, "Promovido ID {$promovido->id} no tiene presidente_id asignado")
                    && str_contains($message, 'seguridad multi-tenant');
            });
    }

    public function test_promovido_with_presidente_id_uses_tenant_prefixed_cache_key(): void
    {
        $whatsAppMock = $this->createMock(WhatsAppService::class);
        $this->app->instance(WhatsAppService::class, $whatsAppMock);

        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363@g.us',
            'alertas_meta_enabled' => true,
        ]);

        $whatsAppMock->expects($this->once())
            ->method('sendMessage')
            ->with('120363@g.us', $this->stringContains('META CUMPLIDA'));

        $promovido = Promovido::create([
            'nombre' => 'María',
            'apellidos' => 'González Soto',
            'promotor_id' => $this->promotorConPresidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'municipality_id' => $this->municipality->id,
            'state_id' => $this->state->id,
            'presidente_id' => $this->presidente->id,
        ]);

        $tenantKey = "orion_pres_{$this->presidente->id}_dem_{$this->demarcacion->id}_completed_alert";
        $this->assertTrue(Cache::has($tenantKey));

        $globalKey = "orion_dem_{$this->demarcacion->id}_completed_alert";
        $this->assertFalse(Cache::has($globalKey));
    }

    public function test_promovido_meta_cumplida_logs_warning_when_no_recipient_or_default_group(): void
    {
        Log::spy();
        Config::set('services.whatsapp.group_id', null);
        putenv('WHATSAPP_WARROOM_GROUP_ID=');

        // No WarRoomConfig creada para este presidente

        $promovido = Promovido::create([
            'nombre' => 'Carlos',
            'apellidos' => 'Hernández',
            'promotor_id' => $this->promotorConPresidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'municipality_id' => $this->municipality->id,
            'state_id' => $this->state->id,
            'presidente_id' => $this->presidente->id,
        ]);

        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function ($message) use ($promovido) {
                return str_contains($message, 'No se pudo despachar alerta de meta cumplida')
                    && str_contains($message, "Demarcación {$this->demarcacion->id}")
                    && str_contains($message, "Presidente: {$promovido->presidente_id}");
            });
    }
}
