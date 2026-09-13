<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\State;
use App\Models\User;
use App\Services\WarRoomReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WarRoomPerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;

    protected Municipality $municipality;

    protected User $presidente;

    protected User $promotor;

    protected WarRoomReportService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Bahía de Banderas', 'state_id' => $this->state->id]);

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

        // Sembrar 10 demarcaciones para probar que las consultas no crecen con N
        for ($i = 1; $i <= 10; $i++) {
            $dem = Demarcacion::create([
                'nombre' => "Demarcación {$i}",
                'municipality_id' => $this->municipality->id,
                'meta' => 100,
            ]);

            // Crear promovidos en algunas demarcaciones
            if ($i <= 5) {
                Promovido::create([
                    'nombre' => "Ciudadano {$i}",
                    'apellidos' => 'Prueba',
                    'promotor_id' => $this->promotor->id,
                    'demarcacion_id' => $dem->id,
                    'municipality_id' => $this->municipality->id,
                    'state_id' => $this->state->id,
                    'presidente_id' => $this->presidente->id,
                    'created_at' => Carbon::now()->subHours(2),
                ]);
            }
        }

        // Sembrar un RD asignado
        User::factory()->create([
            'role' => UserRole::RD,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => Demarcacion::first()->id,
        ]);

        $this->service = app(WarRoomReportService::class);
    }

    public function test_get_demarcaciones_summary_executes_in_constant_queries(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $summary = $this->service->getDemarcacionesSummary($this->presidente->id, $this->municipality->id);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertCount(10, $summary);
        // Debe ser constante O(1): 1 consulta para demarcaciones + 1 consulta agregada para promovidos
        $this->assertLessThanOrEqual(2, count($queries), 'El número de consultas de getDemarcacionesSummary debe ser constante (<= 2)');
    }

    public function test_check_inactivity_alerts_executes_in_constant_queries(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $alertas = $this->service->checkInactivityAlerts($this->presidente->id, $this->municipality->id);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertNotEmpty($alertas);
        // Debe ser constante O(1): 1 para demarcaciones + 1 agregada para promovidos + 1 para RDs
        $this->assertLessThanOrEqual(3, count($queries), 'El número de consultas de checkInactivityAlerts debe ser constante (<= 3)');
    }

    public function test_get_inactive_today_summary_executes_in_constant_queries(): void
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $texto = $this->service->getInactiveTodaySummary($this->presidente->id, $this->municipality->id);

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertNotEmpty($texto);
        // Debe ser constante O(1): 1 para demarcaciones + 1 agregada para promovidos activos hoy
        $this->assertLessThanOrEqual(2, count($queries), 'El número de consultas de getInactiveTodaySummary debe ser constante (<= 2)');
    }
}
