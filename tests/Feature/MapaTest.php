<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use App\Models\Municipality;
use App\Models\State;
use App\Models\Promovido;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Enums\UserRole;

class MapaTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_mapa()
    {
        $response = $this->get('/mapa');
        $response->assertRedirect('/');
    }

    public function test_non_presidente_roles_cannot_access_mapa()
    {
        $rd = User::factory()->create(['role' => UserRole::RD]);
        $response = $this->actingAs($rd)->get('/mapa');
        $response->assertStatus(403);

        $operador = User::factory()->create(['role' => UserRole::OPERADOR]);
        $response = $this->actingAs($operador)->get('/mapa');
        $response->assertStatus(403);

        $promotor = User::factory()->create(['role' => UserRole::PROMOTOR]);
        $response = $this->actingAs($promotor)->get('/mapa');
        $response->assertStatus(403);
    }

    public function test_presidente_can_access_mapa_with_statistics_filtered_by_municipality()
    {
        $state = State::create(['nombre' => 'Nayarit']);
        $muni1 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Bahía de Banderas',
            'lat' => 20.8000000,
            'lng' => -105.2500000,
            'zoom' => 11,
        ]);
        $muni2 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Tepic',
            'lat' => 21.5038889,
            'lng' => -104.8947222,
            'zoom' => 12,
        ]);

        // Demarcaciones y secciones en Muni 1 (Bahía de Banderas)
        $dem1 = Demarcacion::create([
            'id' => 1,
            'nombre' => 'Demarcación 1 - Valle',
            'meta' => 400,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);
        $sec1 = SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $dem1->id,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
            'meta' => 100,
        ]);

        // Demarcaciones y secciones en Muni 2 (Tepic)
        $dem2 = Demarcacion::create([
            'id' => 2,
            'nombre' => 'Demarcación Tepic',
            'meta' => 800,
            'municipality_id' => $muni2->id,
            'state_id' => $state->id,
        ]);
        $sec2 = SeccionElectoral::create([
            'numero' => '0500',
            'demarcacion_id' => $dem2->id,
            'municipality_id' => $muni2->id,
            'state_id' => $state->id,
            'meta' => 200,
        ]);

        // Presidente asignado a Muni 1 (Bahía de Banderas)
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);
        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $presidente->id,
            'presidente_id' => $presidente->id,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);

        // Registrar promovido en Muni 1
        Promovido::create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'clave_elector' => 'ABCDEF123456789012',
            'demarcacion_id' => $dem1->id,
            'seccion_electoral' => '0120',
            'colonia' => 'Centro',
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
            'promotor_id' => $promotor->id,
            'presidente_id' => $presidente->id,
        ]);

        $response = $this->actingAs($presidente)->get('/mapa');
        
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Mapa')
            ->has('demarcaciones', 1)
            ->where('demarcaciones.0.id', $dem1->id)
            ->has('secciones', 1)
            ->where('secciones.0.numero', '0120')
            ->where('currentMunicipality.id', $muni1->id)
            ->where('currentMunicipality.nombre', 'Bahía de Banderas')
            ->where('currentMunicipality.lat', 20.8)
            ->where('currentMunicipality.lng', -105.25)
            ->where('globalStats.total_promovidos', 1)
            ->where('globalStats.total_meta', 400)
        );
    }

    public function test_coordinador_distrito_counts_toward_map_totals()
    {
        $state = State::create(['nombre' => 'Nayarit']);
        $muni1 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Bahía de Banderas',
            'lat' => 20.8000000,
            'lng' => -105.2500000,
            'zoom' => 11,
        ]);

        $dem1 = Demarcacion::create([
            'id' => 1,
            'nombre' => 'Demarcación 1 - Valle',
            'meta' => 400,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);
        $sec1 = SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $dem1->id,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
            'meta' => 100,
        ]);

        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);

        // Coordinador de distrito: solo captura seccion_electoral, no demarcacion_id directamente.
        User::factory()->create([
            'role' => UserRole::COORDINADOR_DISTRITO,
            'parent_id' => $presidente->id,
            'presidente_id' => $presidente->id,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
            'seccion_electoral' => '0120',
        ]);

        $response = $this->actingAs($presidente)->get('/mapa');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Mapa')
            ->where('demarcaciones.0.id', $dem1->id)
            ->where('demarcaciones.0.promovidos', 1)
            ->where('secciones.0.numero', '0120')
            ->where('secciones.0.promovidos', 1)
            ->where('globalStats.total_promovidos', 1)
        );
    }

    public function test_superuser_can_switch_municipality_via_query_parameter()
    {
        $state = State::create(['nombre' => 'Nayarit']);
        $muni1 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Bahía de Banderas',
            'lat' => 20.8000000,
            'lng' => -105.2500000,
            'zoom' => 11,
        ]);
        $muni2 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Tepic',
            'lat' => 21.5038889,
            'lng' => -104.8947222,
            'zoom' => 12,
        ]);

        $dem1 = Demarcacion::create([
            'id' => 1,
            'nombre' => 'Demarcación Bahia',
            'meta' => 400,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);
        $dem2 = Demarcacion::create([
            'id' => 2,
            'nombre' => 'Demarcación Tepic',
            'meta' => 800,
            'municipality_id' => $muni2->id,
            'state_id' => $state->id,
        ]);

        $superuser = User::factory()->create([
            'role' => UserRole::SUPERUSER,
        ]);

        // Acceder al mapa especificando Tepic
        $response = $this->actingAs($superuser)->get("/mapa?municipality_id={$muni2->id}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Mapa')
            ->has('demarcaciones', 1)
            ->where('demarcaciones.0.id', $dem2->id)
            ->where('currentMunicipality.id', $muni2->id)
            ->where('currentMunicipality.nombre', 'Tepic')
            ->where('canSwitchMunicipality', true)
            ->has('availableMunicipalities')
        );
    }
}
