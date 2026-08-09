<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Enums\UserRole;

class SeccionElectoralTest extends TestCase
{
    use RefreshDatabase;

    private Demarcacion $demarcacion;

    protected function setUp(): void
    {
        parent::setUp();
        // Create a default demarcation to test against
        $this->demarcacion = Demarcacion::create([
            'id' => 1,
            'nombre' => 'Demarcación 1',
            'meta' => 500
        ]);
    }

    public function test_guest_cannot_access_sections()
    {
        $response = $this->get("/demarcaciones/{$this->demarcacion->id}/secciones");
        $response->assertRedirect('/');
    }

    public function test_non_presidente_roles_cannot_access_sections()
    {
        $rd = User::factory()->create(['role' => UserRole::RD]);

        // Test Index
        $response = $this->actingAs($rd)->get("/demarcaciones/{$this->demarcacion->id}/secciones");
        $response->assertStatus(403);

        // Test Store
        $response = $this->actingAs($rd)->post("/demarcaciones/{$this->demarcacion->id}/secciones", [
            'numero' => '9999',
            'meta' => 100
        ]);
        $response->assertStatus(403);
    }

    public function test_presidente_can_list_sections()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);

        SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $this->demarcacion->id,
            'meta' => 150
        ]);

        $response = $this->actingAs($presidente)->get("/demarcaciones/{$this->demarcacion->id}/secciones");
        $response->assertStatus(200);
        $response->assertJsonFragment([
            'numero' => '0120',
            'meta' => 150
        ]);
    }

    public function test_presidente_can_create_section()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);

        $response = $this->actingAs($presidente)->post("/demarcaciones/{$this->demarcacion->id}/secciones", [
            'numero' => '0121',
            'meta' => 200
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        $this->assertDatabaseHas('secciones_electorales', [
            'numero' => '0121',
            'demarcacion_id' => $this->demarcacion->id,
            'meta' => 200
        ]);
    }

    public function test_create_section_enforces_unique_number()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        
        SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $this->demarcacion->id,
            'meta' => 150
        ]);

        $response = $this->actingAs($presidente)->post("/demarcaciones/{$this->demarcacion->id}/secciones", [
            'numero' => '0120', // Duplicate number
            'meta' => 100
        ]);

        $response->assertSessionHasErrors('numero');
    }

    public function test_presidente_can_update_section()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        
        $seccion = SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $this->demarcacion->id,
            'meta' => 150
        ]);

        $response = $this->actingAs($presidente)->put("/secciones/{$seccion->id}", [
            'numero' => '0122',
            'meta' => 180
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        $this->assertDatabaseHas('secciones_electorales', [
            'id' => $seccion->id,
            'numero' => '0122',
            'meta' => 180
        ]);
    }

    public function test_presidente_can_delete_section()
    {
        $presidente = User::factory()->create(['role' => UserRole::PRESIDENTE]);
        
        $seccion = SeccionElectoral::create([
            'numero' => '0120',
            'demarcacion_id' => $this->demarcacion->id,
            'meta' => 150
        ]);

        $response = $this->actingAs($presidente)->delete("/secciones/{$seccion->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        $this->assertSoftDeleted('secciones_electorales', [
            'id' => $seccion->id
        ]);
    }
}
