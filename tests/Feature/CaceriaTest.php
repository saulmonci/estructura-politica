<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CaceriaTest extends TestCase
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
        $this->demarcacion = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $this->municipality->id]);

        $this->presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);
        $this->presidente->presidente_id = $this->presidente->id;
        $this->presidente->save();
    }

    public function test_guest_cannot_access_caceria(): void
    {
        $response = $this->get('/caceria');
        $response->assertRedirect('/');
    }

    public function test_unauthorized_roles_cannot_access_caceria(): void
    {
        $rd = User::factory()->create(['role' => UserRole::RD, 'presidente_id' => $this->presidente->id]);
        $operador = User::factory()->create(['role' => UserRole::OPERADOR, 'presidente_id' => $this->presidente->id]);
        $promotor = User::factory()->create(['role' => UserRole::PROMOTOR, 'presidente_id' => $this->presidente->id]);
        $coordinador = User::factory()->create(['role' => UserRole::COORDINADOR_DISTRITO, 'presidente_id' => $this->presidente->id]);

        $this->actingAs($rd)->get('/caceria')->assertStatus(403);
        $this->actingAs($operador)->get('/caceria')->assertStatus(403);
        $this->actingAs($promotor)->get('/caceria')->assertStatus(403);
        $this->actingAs($coordinador)->get('/caceria')->assertStatus(403);
    }

    public function test_presidente_can_access_caceria_view(): void
    {
        $response = $this->actingAs($this->presidente)->get('/caceria');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Caceria/Index')
            ->has('voters')
            ->has('stats')
            ->has('demarcaciones')
            ->has('secciones')
        );
    }

    public function test_presidente_can_toggle_voto_for_promovido(): void
    {
        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'presidente_id' => $this->presidente->id,
        ]);

        $promovido = Promovido::create([
            'nombre' => 'Juan',
            'apellidos' => 'Pérez López',
            'clave_elector' => 'PRZLPZ80010118M100',
            'curp' => 'PRZLPZ800101HDFR00',
            'seccion_electoral' => '0450',
            'colonia' => 'Centro',
            'promotor_id' => $promotor->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'ha_votado' => false,
        ]);

        // 1. Marcar voto
        $response = $this->actingAs($this->presidente)->postJson('/caceria/toggle-voto', [
            'id' => $promovido->id,
            'source_type' => 'promovido',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'ha_votado' => true,
        ]);

        $promovido->refresh();
        $this->assertTrue($promovido->ha_votado);
        $this->assertNotNull($promovido->voto_at);
        $this->assertEquals($this->presidente->id, $promovido->marcado_por_id);

        // 2. Desmarcar voto
        $response2 = $this->actingAs($this->presidente)->postJson('/caceria/toggle-voto', [
            'id' => $promovido->id,
            'source_type' => 'promovido',
        ]);

        $response2->assertStatus(200);
        $response2->assertJson([
            'success' => true,
            'ha_votado' => false,
        ]);

        $promovido->refresh();
        $this->assertFalse($promovido->ha_votado);
        $this->assertNull($promovido->voto_at);
        $this->assertNull($promovido->marcado_por_id);
    }

    public function test_presidente_can_toggle_voto_for_structure_member(): void
    {
        $operador = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'presidente_id' => $this->presidente->id,
            'ha_votado' => false,
        ]);

        $response = $this->actingAs($this->presidente)->postJson('/caceria/toggle-voto', [
            'id' => $operador->id,
            'source_type' => 'user',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'ha_votado' => true,
        ]);

        $operador->refresh();
        $this->assertTrue($operador->ha_votado);
        $this->assertNotNull($operador->voto_at);
        $this->assertEquals($this->presidente->id, $operador->marcado_por_id);
    }

    public function test_presidente_cannot_toggle_voto_for_another_presidente_voters(): void
    {
        $otroPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $promovidoOtro = Promovido::create([
            'nombre' => 'Carlos',
            'apellidos' => 'Ruiz',
            'clave_elector' => 'RUIZCL85010118M200',
            'seccion_electoral' => '0451',
            'colonia' => 'Norte',
            'promotor_id' => $this->presidente->id,
            'presidente_id' => $otroPresidente->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);

        $response = $this->actingAs($this->presidente)->postJson('/caceria/toggle-voto', [
            'id' => $promovidoOtro->id,
            'source_type' => 'promovido',
        ]);

        $response->assertStatus(403);
    }

    public function test_caceria_stats_calculates_correct_totals_for_structure_and_promovidos(): void
    {
        // 2 miembros de estructura
        $op = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'presidente_id' => $this->presidente->id,
            'ha_votado' => true,
            'voto_at' => now(),
        ]);
        $pr = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'presidente_id' => $this->presidente->id,
            'ha_votado' => false,
        ]);

        // 2 promovidos
        $prom1 = Promovido::create([
            'nombre' => 'Persona 1',
            'apellidos' => 'Apellido',
            'clave_elector' => 'PERONE80010118M101',
            'seccion_electoral' => '0450',
            'colonia' => 'Centro',
            'promotor_id' => $pr->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'ha_votado' => true,
            'voto_at' => now(),
        ]);
        $prom2 = Promovido::create([
            'nombre' => 'Persona 2',
            'apellidos' => 'Apellido',
            'clave_elector' => 'PERTWO80010118M102',
            'seccion_electoral' => '0450',
            'colonia' => 'Centro',
            'promotor_id' => $pr->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'ha_votado' => false,
        ]);

        $response = $this->actingAs($this->presidente)->getJson('/caceria');
        $response->assertStatus(200);

        $stats = $response->json('stats');

        // Estructura: 2 total, 1 votó, 1 falta
        $this->assertEquals(2, $stats['total_estructura']);
        $this->assertEquals(1, $stats['votaron_estructura']);
        $this->assertEquals(1, $stats['faltan_estructura']);
        $this->assertEquals(50.0, $stats['pct_estructura']);

        // Promovidos: 2 total, 1 votó, 1 falta
        $this->assertEquals(2, $stats['total_promovidos']);
        $this->assertEquals(1, $stats['votaron_promovidos']);
        $this->assertEquals(1, $stats['faltan_promovidos']);
        $this->assertEquals(50.0, $stats['pct_promovidos']);

        // Gran Total: 4 total, 2 votaron, 2 faltan
        $this->assertEquals(4, $stats['total_general']);
        $this->assertEquals(2, $stats['votaron_general']);
        $this->assertEquals(2, $stats['faltan_general']);
        $this->assertEquals(50.0, $stats['pct_general']);
    }

    public function test_caceria_export_generates_csv(): void
    {
        $response = $this->actingAs($this->presidente)->get('/caceria/export');
        $response->assertStatus(200);
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename="caceria_dia_d_', $response->headers->get('Content-Disposition'));
    }
}
