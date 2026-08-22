<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Demarcacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Enums\UserRole;

class DemarcacionTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_demarcaciones()
    {
        $response = $this->get('/demarcaciones');
        $response->assertRedirect('/');
    }

    public function test_non_presidente_roles_cannot_access_demarcaciones()
    {
        $rd = User::factory()->create(['role' => UserRole::RD]);
        
        $response = $this->actingAs($rd)->get('/demarcaciones');
        $response->assertStatus(403);

        $response = $this->actingAs($rd)->post('/demarcaciones', [
            'id' => 10,
            'nombre' => 'Demarcación de Prueba',
            'meta' => 100
        ]);
        $response->assertStatus(403);
    }

    public function test_presidente_can_list_demarcaciones()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación 1', 'meta' => 400]);

        $response = $this->actingAs($presidente)->get('/demarcaciones');
        $response->assertStatus(200);
    }

    public function test_presidente_can_create_demarcacion()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);

        $response = $this->actingAs($presidente)->post('/demarcaciones', [
            'id' => 10,
            'nombre' => 'Demarcación 10',
            'meta' => 500
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('demarcaciones', [
            'id' => 10,
            'nombre' => 'Demarcación 10',
            'meta' => 500
        ]);
    }

    public function test_create_demarcacion_enforces_validation()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación 1', 'meta' => 400]);

        // Duplicate ID
        $response = $this->actingAs($presidente)->post('/demarcaciones', [
            'id' => 1,
            'nombre' => 'Demarcación Duplicada',
            'meta' => 500
        ]);
        $response->assertSessionHasErrors('id');
    }

    public function test_presidente_can_update_demarcacion()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $dem = Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación Antigua', 'meta' => 400]);

        $response = $this->actingAs($presidente)->put("/demarcaciones/{$dem->id}", [
            'id' => 1, // disabled edit ID but must pass in request
            'nombre' => 'Demarcación Nueva',
            'meta' => 450
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('demarcaciones', [
            'id' => 1,
            'nombre' => 'Demarcación Nueva',
        ]);
        $this->assertDatabaseHas('demarcacion_presidente', [
            'presidente_id' => $presidente->id,
            'demarcacion_id' => 1,
            'meta' => 450
        ]);
    }

    public function test_multi_presidente_metas_isolation()
    {
        $presidente1 = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $presidente2 = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $dem = Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación 1', 'meta' => 500]);

        // Presidente 1 sets meta to 700
        $this->actingAs($presidente1)->put("/demarcaciones/{$dem->id}", [
            'id' => 1,
            'nombre' => 'Demarcación 1',
            'meta' => 700
        ]);

        // Presidente 2 sets meta to 900
        $this->actingAs($presidente2)->put("/demarcaciones/{$dem->id}", [
            'id' => 1,
            'nombre' => 'Demarcación 1',
            'meta' => 900
        ]);

        $this->assertEquals(700, $dem->fresh()->getMetaForPresidente($presidente1->id));
        $this->assertEquals(900, $dem->fresh()->getMetaForPresidente($presidente2->id));
    }

    public function test_presidente_can_delete_demarcacion()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        $dem = Demarcacion::create(['id' => 1, 'nombre' => 'Demarcación a borrar', 'meta' => 400]);

        $response = $this->actingAs($presidente)->delete("/demarcaciones/{$dem->id}");

        $response->assertRedirect();
        $this->assertSoftDeleted('demarcaciones', [
            'id' => 1
        ]);
    }
}
