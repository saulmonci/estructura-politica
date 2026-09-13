<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Jobs\SendWhatsAppMessageJob;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use App\Models\WarRoomConfig;
use App\Services\WarRoomReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class WarRoomCommandsTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;

    protected Municipality $municipality;

    protected Demarcacion $demarcacion;

    protected User $presidente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Bahía de Banderas', 'state_id' => $this->state->id]);
        $this->demarcacion = Demarcacion::create([
            'nombre' => 'Demarcación 1',
            'municipality_id' => $this->municipality->id,
            'meta' => 10,
        ]);

        $this->presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'telefono' => '3221234567',
        ]);
    }

    public function test_send_daily_report_dry_run_does_not_queue_job(): void
    {
        Queue::fake();

        $this->artisan('orion:send-daily-report', [
            '--dry-run' => true,
            '--presidente_id' => $this->presidente->id,
            '--to' => '523221234567',
        ])->assertSuccessful();

        Queue::assertNothingPushed();
    }

    public function test_send_daily_report_with_target_queues_job_and_returns_success(): void
    {
        Queue::fake();

        $this->artisan('orion:send-daily-report', [
            '--to' => '523221234567',
            '--presidente_id' => $this->presidente->id,
        ])->assertSuccessful();

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '523221234567'
                && ! empty($job->text);
        });
    }

    public function test_send_daily_report_fails_when_no_recipient_is_configured(): void
    {
        Queue::fake();
        Config::set('services.whatsapp.group_id', null);
        putenv('WHATSAPP_WARROOM_GROUP_ID=');

        $this->artisan('orion:send-daily-report', [
            '--presidente_id' => $this->presidente->id,
        ])->assertFailed();

        Queue::assertNothingPushed();
    }

    public function test_send_daily_report_modo_2_multi_tenant_queues_job_for_active_war_rooms(): void
    {
        Queue::fake();

        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363023456789@g.us',
            'reporte_matutino_enabled' => true,
        ]);

        $this->artisan('orion:send-daily-report')->assertSuccessful();

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '120363023456789@g.us';
        });
    }

    public function test_check_inactivity_dry_run_does_not_queue_job_nor_set_cache(): void
    {
        Queue::fake();
        Cache::flush();

        $reportMock = $this->createMock(WarRoomReportService::class);
        $reportMock->method('checkInactivityAlerts')
            ->willReturn([
                ['demarcacion_id' => $this->demarcacion->id, 'mensaje' => 'Demarcación 1 lleva 24h sin actividad'],
            ]);
        $this->app->instance(WarRoomReportService::class, $reportMock);

        $this->artisan('orion:check-inactivity', [
            '--dry-run' => true,
            '--presidente_id' => $this->presidente->id,
        ])->assertSuccessful();

        Queue::assertNothingPushed();

        $hoy = Carbon::today()->format('Y-m-d');
        $this->assertFalse(Cache::has("orion_inactivity_pres_{$this->presidente->id}_dem_{$this->demarcacion->id}_{$hoy}"));
    }

    public function test_check_inactivity_queues_job_and_sets_rate_limiting_cache_immediately(): void
    {
        Queue::fake();
        Cache::flush();

        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363023456789@g.us',
            'alertas_inactividad_enabled' => true,
        ]);

        $reportMock = $this->createMock(WarRoomReportService::class);
        $reportMock->method('checkInactivityAlerts')
            ->willReturn([
                ['demarcacion_id' => $this->demarcacion->id, 'mensaje' => 'Demarcación 1 lleva 24h sin actividad'],
            ]);
        $this->app->instance(WarRoomReportService::class, $reportMock);

        $this->artisan('orion:check-inactivity', [
            '--presidente_id' => $this->presidente->id,
        ])->assertSuccessful();

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '120363023456789@g.us'
                && str_contains($job->text, 'Demarcación 1');
        });

        $hoy = Carbon::today()->format('Y-m-d');
        $cacheKey = "orion_inactivity_pres_{$this->presidente->id}_dem_{$this->demarcacion->id}_{$hoy}";
        $this->assertTrue(Cache::has($cacheKey));

        // Segunda ejecución consecutiva el mismo día debe ser omitida por cache
        Queue::fake(); // limpia la cola de aserciones

        $this->artisan('orion:check-inactivity', [
            '--presidente_id' => $this->presidente->id,
        ])->assertSuccessful();

        Queue::assertNothingPushed();
    }

    public function test_check_inactivity_modo_2_multi_tenant_evaluates_active_war_rooms(): void
    {
        Queue::fake();
        Cache::flush();

        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363023456789@g.us',
            'alertas_inactividad_enabled' => true,
        ]);

        $reportMock = $this->createMock(WarRoomReportService::class);
        $reportMock->method('checkInactivityAlerts')
            ->with($this->presidente->id, $this->municipality->id)
            ->willReturn([
                ['demarcacion_id' => $this->demarcacion->id, 'mensaje' => 'Demarcación 1 inactiva'],
            ]);
        $this->app->instance(WarRoomReportService::class, $reportMock);

        $this->artisan('orion:check-inactivity')->assertSuccessful();

        Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
            return $job->recipient === '120363023456789@g.us';
        });

        $hoy = Carbon::today()->format('Y-m-d');
        $this->assertTrue(Cache::has("orion_inactivity_pres_{$this->presidente->id}_dem_{$this->demarcacion->id}_{$hoy}"));
    }

    public function test_send_daily_report_multi_tenant_continues_when_one_presidente_lacks_municipality(): void
    {
        Queue::fake();

        // Presidente 1 (válido con municipio configurado en setUp)
        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363023456789@g.us',
            'reporte_matutino_enabled' => true,
        ]);

        // Presidente 2 (inválido, sin municipality_id)
        $invalidPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => null,
            'telefono' => '3220000000',
        ]);

        WarRoomConfig::create([
            'presidente_id' => $invalidPresidente->id,
            'whatsapp_group_id' => '120363999999999@g.us',
            'reporte_matutino_enabled' => true,
        ]);

        $prevMuni = $_ENV['ORION_MUNICIPALITY_ID'] ?? null;
        $prevPres = $_ENV['ORION_PRESIDENTE_ID'] ?? null;
        unset($_ENV['ORION_MUNICIPALITY_ID'], $_SERVER['ORION_MUNICIPALITY_ID']);
        unset($_ENV['ORION_PRESIDENTE_ID'], $_SERVER['ORION_PRESIDENTE_ID']);
        putenv('ORION_MUNICIPALITY_ID');
        putenv('ORION_PRESIDENTE_ID');

        try {
            // Debe retornar FAILURE porque hubo 1 error, pero sin abortar el bucle
            $this->artisan('orion:send-daily-report')->assertFailed();

            // Presidente válido sí fue encolado
            Queue::assertPushed(SendWhatsAppMessageJob::class, function ($job) {
                return $job->recipient === '120363023456789@g.us';
            });

            // Presidente inválido no fue encolado
            Queue::assertNotPushed(SendWhatsAppMessageJob::class, function ($job) {
                return $job->recipient === '120363999999999@g.us';
            });
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

    public function test_check_inactivity_multi_tenant_continues_when_one_presidente_lacks_municipality(): void
    {
        Queue::fake();
        Cache::flush();

        // Presidente 1 (válido)
        WarRoomConfig::create([
            'presidente_id' => $this->presidente->id,
            'whatsapp_group_id' => '120363023456789@g.us',
            'alertas_inactividad_enabled' => true,
        ]);

        // Presidente 2 (inválido sin municipio)
        $invalidPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => null,
            'telefono' => '3220000000',
        ]);

        WarRoomConfig::create([
            'presidente_id' => $invalidPresidente->id,
            'whatsapp_group_id' => '120363999999999@g.us',
            'alertas_inactividad_enabled' => true,
        ]);

        $prevMuni = $_ENV['ORION_MUNICIPALITY_ID'] ?? null;
        $prevPres = $_ENV['ORION_PRESIDENTE_ID'] ?? null;
        unset($_ENV['ORION_MUNICIPALITY_ID'], $_SERVER['ORION_MUNICIPALITY_ID']);
        unset($_ENV['ORION_PRESIDENTE_ID'], $_SERVER['ORION_PRESIDENTE_ID']);
        putenv('ORION_MUNICIPALITY_ID');
        putenv('ORION_PRESIDENTE_ID');

        try {
            $this->artisan('orion:check-inactivity')->assertFailed();

            // Presidente válido sí se procesó (aunque no haya alertas en BD, no arrojó excepción de municipio)
            // Para asegurar que corrió sobre el válido, confirmamos que el inválido no encoló
            Queue::assertNotPushed(SendWhatsAppMessageJob::class, function ($job) {
                return $job->recipient === '120363999999999@g.us';
            });
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

    public function test_send_daily_report_mode_1_fails_when_municipality_cannot_be_resolved(): void
    {
        Queue::fake();

        $invalidPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => null,
            'telefono' => '3221112233',
        ]);

        $prevMuni = $_ENV['ORION_MUNICIPALITY_ID'] ?? null;
        $prevPres = $_ENV['ORION_PRESIDENTE_ID'] ?? null;
        unset($_ENV['ORION_MUNICIPALITY_ID'], $_SERVER['ORION_MUNICIPALITY_ID']);
        unset($_ENV['ORION_PRESIDENTE_ID'], $_SERVER['ORION_PRESIDENTE_ID']);
        putenv('ORION_MUNICIPALITY_ID');
        putenv('ORION_PRESIDENTE_ID');

        try {
            $this->artisan('orion:send-daily-report', [
                '--presidente_id' => $invalidPresidente->id,
                '--to' => '523221112233',
            ])->assertFailed();

            Queue::assertNothingPushed();
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

    public function test_check_inactivity_mode_1_fails_when_municipality_cannot_be_resolved(): void
    {
        Queue::fake();

        $invalidPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => null,
            'telefono' => '3221112233',
        ]);

        $prevMuni = $_ENV['ORION_MUNICIPALITY_ID'] ?? null;
        $prevPres = $_ENV['ORION_PRESIDENTE_ID'] ?? null;
        unset($_ENV['ORION_MUNICIPALITY_ID'], $_SERVER['ORION_MUNICIPALITY_ID']);
        unset($_ENV['ORION_PRESIDENTE_ID'], $_SERVER['ORION_PRESIDENTE_ID']);
        putenv('ORION_MUNICIPALITY_ID');
        putenv('ORION_PRESIDENTE_ID');

        try {
            $this->artisan('orion:check-inactivity', [
                '--presidente_id' => $invalidPresidente->id,
            ])->assertFailed();

            Queue::assertNothingPushed();
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
}
