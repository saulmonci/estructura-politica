<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Promovido;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Enums\UserRole;

class CoordinadorDistritoTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected Demarcacion $demarcacion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Tepic', 'state_id' => $this->state->id]);
        $this->demarcacion = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $this->municipality->id]);
    }

    public function test_guest_cannot_access_coordinadores(): void
    {
        $response = $this->get('/coordinadores');
        $response->assertRedirect('/');
    }

    public function test_unauthorized_roles_cannot_access_coordinadores(): void
    {
        $rd = User::factory()->create(['role' => UserRole::RD]);
        $operador = User::factory()->create(['role' => UserRole::OPERADOR]);
        $promotor = User::factory()->create(['role' => UserRole::PROMOTOR]);

        $this->actingAs($rd)->get('/coordinadores')->assertStatus(403);
        $this->actingAs($operador)->get('/coordinadores')->assertStatus(403);
        $this->actingAs($promotor)->get('/coordinadores')->assertStatus(403);
    }

    public function test_presidente_can_list_and_create_coordinador(): void
    {
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $response = $this->actingAs($presidente)->get('/coordinadores');
        $response->assertStatus(200);

        $responseCreate = $this->actingAs($presidente)->post('/coordinadores', [
            'nombre' => 'Carlos',
            'apellidos' => 'Mendoza',
            'telefono' => '3111234567',
            'email' => 'carlos.mendoza@test.local',
            'curp' => 'MENC800101HNTNNN01',
        ]);

        $responseCreate->assertRedirect();

        $this->assertDatabaseHas('users', [
            'nombre' => 'Carlos',
            'apellidos' => 'Mendoza',
            'role' => UserRole::COORDINADOR_DISTRITO->value,
            'presidente_id' => $presidente->id,
            'parent_id' => $presidente->id,
        ]);
    }

    public function test_coordinador_can_view_dashboard_and_mapa(): void
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $coordinador = User::factory()->create([
            'role' => UserRole::COORDINADOR_DISTRITO,
            'presidente_id' => $presidente->id,
            'parent_id' => $presidente->id,
        ]);

        $responseDashboard = $this->actingAs($coordinador)->get('/dashboard');
        $responseDashboard->assertStatus(200);

        $responseMapa = $this->actingAs($coordinador)->get('/mapa');
        $responseMapa->assertStatus(200);
    }

    public function test_coordinador_can_query_promovidos_of_their_presidente(): void
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $coordinador = User::factory()->create([
            'role' => UserRole::COORDINADOR_DISTRITO,
            'presidente_id' => $presidente->id,
            'parent_id' => $presidente->id,
        ]);

        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'presidente_id' => $presidente->id,
        ]);

        $promovido = Promovido::factory()->create([
            'promotor_id' => $promotor->id,
            'presidente_id' => $presidente->id,
        ]);

        $results = $coordinador->queryPromovidos()->get();
        $this->assertTrue($results->contains('id', $promovido->id));
    }

    public function test_coordinador_with_null_presidente_id_resolves_from_parent_and_views_structure(): void
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        // Coordinador with null presidente_id but parent_id set to presidente
        $coordinador = User::factory()->create([
            'role' => UserRole::COORDINADOR_DISTRITO,
            'presidente_id' => null,
            'parent_id' => $presidente->id,
        ]);

        $rd = User::factory()->create([
            'role' => UserRole::RD,
            'presidente_id' => $presidente->id,
            'parent_id' => $presidente->id,
        ]);

        $this->assertEquals($presidente->id, $coordinador->getPresidenteId());

        $responseDashboard = $this->actingAs($coordinador)->get('/dashboard');
        $responseDashboard->assertStatus(200);

        $rdListResponse = $this->actingAs($coordinador)->getJson('/representantes');
        $rdListResponse->assertStatus(200);
        $this->assertStringContainsString($rd->name, $rdListResponse->getContent());
    }

    public function test_superuser_can_create_coordinador_for_a_presidente(): void
    {
        $superuser = User::factory()->create(['role' => UserRole::SUPERUSER]);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $response = $this->actingAs($superuser)->post('/coordinadores', [
            'nombre' => 'Rodrigo',
            'apellidos' => 'Vargas',
            'telefono' => '3119876543',
            'email' => 'rodrigo.vargas@test.local',
            'curp' => 'VARR850512HNTNNN02',
            'parent_id' => $presidente->id,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('users', [
            'nombre' => 'Rodrigo',
            'apellidos' => 'Vargas',
            'role' => UserRole::COORDINADOR_DISTRITO->value,
            'presidente_id' => $presidente->id,
            'parent_id' => $presidente->id,
            'state_id' => $presidente->state_id,
            'municipality_id' => $presidente->municipality_id,
        ]);

        $presidenteResponse = $this->actingAs($presidente)->getJson('/coordinadores');
        $presidenteResponse->assertStatus(200);
        $this->assertStringContainsString('Rodrigo', $presidenteResponse->getContent());
    }
}
