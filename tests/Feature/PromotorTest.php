<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Promovido;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use App\Enums\UserRole;

class PromotorTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected Demarcacion $demarcacion;
    protected User $presidente;
    protected User $rd;
    protected User $operador;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Tepic', 'state_id' => $this->state->id]);
        $this->demarcacion = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $this->municipality->id]);

        $this->presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $this->rd = User::factory()->create([
            'role' => UserRole::RD,
            'parent_id' => $this->presidente->id,
            'presidente_id' => $this->presidente->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);

        $this->operador = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->rd->id,
            'presidente_id' => $this->presidente->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);
    }

    public function test_operador_can_create_promotor_without_password(): void
    {
        $response = $this->actingAs($this->operador)->post('/promotores', [
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'telefono' => '3111234567',
            'demarcacion_id' => $this->demarcacion->id,
            'estado' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'role' => UserRole::PROMOTOR->value,
            'parent_id' => $this->operador->id,
        ]);

        $promotor = User::where('nombre', 'Juan')->where('apellidos', 'Pérez')->first();
        $this->assertNotNull($promotor);
        $this->assertNotNull($promotor->password);
        $this->assertTrue(Hash::check('secret', $promotor->password));
    }

    public function test_operador_can_update_promotor_without_changing_password(): void
    {
        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $this->operador->id,
            'presidente_id' => $this->presidente->id,
            'nombre' => 'Original',
            'apellidos' => 'Nombre',
            'password' => Hash::make('mypassword123'),
        ]);

        $originalHash = $promotor->password;

        $response = $this->actingAs($this->operador)->put("/promotores/{$promotor->id}", [
            'nombre' => 'Modificado',
            'apellidos' => 'Nombre',
            'parent_id' => $this->operador->id,
        ]);

        $response->assertRedirect();
        $promotor->refresh();
        $this->assertEquals('Modificado', $promotor->nombre);
        $this->assertEquals($originalHash, $promotor->password);
    }
}
