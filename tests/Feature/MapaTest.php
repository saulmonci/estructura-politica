<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Demarcacion;
use App\Models\Promovido;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

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
        $rd = User::factory()->create(['role' => 'rd']);
        $response = $this->actingAs($rd)->get('/mapa');
        $response->assertStatus(403);

        $operador = User::factory()->create(['role' => 'operador']);
        $response = $this->actingAs($operador)->get('/mapa');
        $response->assertStatus(403);

        $promotor = User::factory()->create(['role' => 'promotor']);
        $response = $this->actingAs($promotor)->get('/mapa');
        $response->assertStatus(403);
    }

    public function test_presidente_can_access_mapa_with_statistics()
    {
        // Sembrar demarcaciones de prueba
        $dem1 = Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación 1', 'total_votantes' => 400]);
        $dem2 = Demarcacion::create(['id' => 2, 'nombre' => 'Demarcación 2', 'total_votantes' => 1000]);

        $presidente = User::factory()->create(['role' => 'presidente']);
        $promotor = User::factory()->create(['role' => 'promotor', 'parent_id' => $presidente->id]);

        // Registrar promovidos en demarcaciones
        Promovido::create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'clave_elector' => 'ABCDEF123456789012',
            'demarcacion' => '1',
            'seccion_electoral' => '0120',
            'colonia' => 'Centro',
            'promotor_id' => $promotor->id,
        ]);

        $response = $this->actingAs($presidente)->get('/mapa');
        
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Mapa')
            ->has('demarcaciones')
            ->has('globalStats')
            ->where('globalStats.total_promovidos', 1)
            ->where('globalStats.total_meta', 1400)
        );
    }
}
