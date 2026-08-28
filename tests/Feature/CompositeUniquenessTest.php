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

class CompositeUniquenessTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality1;
    protected Municipality $municipality2;
    protected Demarcacion $demarcacion1;
    protected Demarcacion $demarcacion2;
    protected User $presidente1;
    protected User $presidente2;
    protected User $operador1;
    protected User $operador2;
    protected User $promotor1;
    protected User $promotor2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality1 = Municipality::create(['nombre' => 'Tepic', 'state_id' => $this->state->id]);
        $this->municipality2 = Municipality::create(['nombre' => 'Xalisco', 'state_id' => $this->state->id]);
        $this->demarcacion1 = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $this->municipality1->id]);
        $this->demarcacion2 = Demarcacion::create(['nombre' => 'Demarcación 2', 'municipality_id' => $this->municipality2->id]);

        // Presidente 1
        $this->presidente1 = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality1->id,
        ]);
        $this->presidente1->update(['presidente_id' => $this->presidente1->id]);

        $this->operador1 = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->presidente1->id,
            'presidente_id' => $this->presidente1->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $this->promotor1 = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $this->operador1->id,
            'presidente_id' => $this->presidente1->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        // Presidente 2
        $this->presidente2 = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality2->id,
        ]);
        $this->presidente2->update(['presidente_id' => $this->presidente2->id]);

        $this->operador2 = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->presidente2->id,
            'presidente_id' => $this->presidente2->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality2->id,
            'demarcacion_id' => $this->demarcacion2->id,
        ]);

        $this->promotor2 = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $this->operador2->id,
            'presidente_id' => $this->presidente2->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality2->id,
            'demarcacion_id' => $this->demarcacion2->id,
        ]);
    }

    public function test_different_presidents_can_have_promovidos_with_same_curp_and_clave(): void
    {
        $sharedCurp = 'CURPTEST1234567890';
        $sharedClave = 'CLAVETEST123456789';

        // Presidente 1 registra promovido
        $response1 = $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Carlos',
            'apellidos' => 'González',
            'curp' => $sharedCurp,
            'clave_elector' => $sharedClave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $response1->assertRedirect();
        $response1->assertSessionHasNoErrors();

        // Presidente 2 registra promovido con el mismo CURP y Clave de Elector
        $response2 = $this->actingAs($this->promotor2)->post('/promovidos', [
            'nombre' => 'Carlos',
            'apellidos' => 'González 2',
            'curp' => $sharedCurp,
            'clave_elector' => $sharedClave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor2->id,
            'demarcacion_id' => $this->demarcacion2->id,
        ]);
        $response2->assertRedirect();
        $response2->assertSessionHasNoErrors();

        $this->assertDatabaseCount('promovidos', 2);
    }

    public function test_same_president_cannot_have_duplicate_curp_in_promovidos(): void
    {
        $sharedCurp = 'CURPTEST1234567890';

        $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Ana',
            'apellidos' => 'López',
            'curp' => $sharedCurp,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responseDuplicate = $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Ana 2',
            'apellidos' => 'López 2',
            'curp' => $sharedCurp,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responseDuplicate->assertSessionHasErrors('curp');
        $this->assertDatabaseCount('promovidos', 1);
    }

    public function test_same_president_cannot_have_duplicate_clave_in_promovidos(): void
    {
        $sharedClave = 'CLAVETEST123456789';

        $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Roberto',
            'apellidos' => 'Silva',
            'clave_elector' => $sharedClave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responseDuplicate = $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Roberto 2',
            'apellidos' => 'Silva 2',
            'clave_elector' => $sharedClave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responseDuplicate->assertSessionHasErrors('clave_elector');
        $this->assertDatabaseCount('promovidos', 1);
    }

    public function test_different_presidents_can_have_users_with_same_curp_and_clave(): void
    {
        $sharedCurp = 'USERCURP1234567890';
        $sharedClave = 'USERCLAV1234567890';

        // Operador 1 crea promotor con CURP y Clave
        $response1 = $this->actingAs($this->operador1)->post('/promotores', [
            'nombre' => 'Pedro',
            'apellidos' => 'Martínez',
            'curp' => $sharedCurp,
            'clave_electoral' => $sharedClave,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $response1->assertRedirect();
        $response1->assertSessionHasNoErrors();

        // Operador 2 (bajo Presidente 2) crea promotor con mismo CURP y Clave
        $response2 = $this->actingAs($this->operador2)->post('/promotores', [
            'nombre' => 'Pedro',
            'apellidos' => 'Martínez 2',
            'curp' => $sharedCurp,
            'clave_electoral' => $sharedClave,
            'parent_id' => $this->operador2->id,
            'demarcacion_id' => $this->demarcacion2->id,
        ]);
        $response2->assertRedirect();
        $response2->assertSessionHasNoErrors();

        $promotores = User::where('curp', $sharedCurp)->get();
        $this->assertCount(2, $promotores);
    }

    public function test_same_president_cannot_have_duplicate_curp_or_clave_in_users(): void
    {
        $sharedCurp = 'USERCURP1234567890';
        $sharedClave = 'USERCLAV1234567890';

        $this->actingAs($this->operador1)->post('/promotores', [
            'nombre' => 'Laura',
            'apellidos' => 'Torres',
            'curp' => $sharedCurp,
            'clave_electoral' => $sharedClave,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        // Mismo presidente intenta registrar otro promotor con el mismo CURP
        $responseCurp = $this->actingAs($this->operador1)->post('/promotores', [
            'nombre' => 'Laura 2',
            'apellidos' => 'Torres 2',
            'curp' => $sharedCurp,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responseCurp->assertSessionHasErrors('curp');

        // Mismo presidente intenta registrar otro promotor con la misma Clave
        $responseClave = $this->actingAs($this->operador1)->post('/promotores', [
            'nombre' => 'Laura 3',
            'apellidos' => 'Torres 3',
            'clave_electoral' => $sharedClave,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responseClave->assertSessionHasErrors('clave_electoral');
    }

    public function test_soft_deleted_records_allow_reusing_curp_and_clave_under_same_president(): void
    {
        $curp = 'DELETEDCURP1234567';
        $clave = 'DELETEDCLAV1234567';

        // 1. Promovido
        $promovido = Promovido::create([
            'nombre' => 'Eliminado',
            'apellidos' => 'Promovido',
            'curp' => $curp,
            'clave_elector' => $clave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'presidente_id' => $this->presidente1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $promovido->delete(); // Soft delete

        // Intentar registrar un nuevo promovido con los mismos datos
        $responsePromovido = $this->actingAs($this->promotor1)->post('/promovidos', [
            'nombre' => 'Nuevo',
            'apellidos' => 'Promovido',
            'curp' => $curp,
            'clave_elector' => $clave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responsePromovido->assertRedirect();
        $responsePromovido->assertSessionHasNoErrors();

        // 2. User (Promotor)
        $userCurp = 'USERDELCURP1234567';
        $userClave = 'USERDELCLAV1234567';

        $user = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'curp' => $userCurp,
            'clave_electoral' => $userClave,
            'parent_id' => $this->operador1->id,
            'presidente_id' => $this->presidente1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $user->delete(); // Soft delete

        // Intentar registrar un nuevo promotor con los mismos datos
        $responseUser = $this->actingAs($this->operador1)->post('/promotores', [
            'nombre' => 'Nuevo',
            'apellidos' => 'Promotor',
            'curp' => $userCurp,
            'clave_electoral' => $userClave,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responseUser->assertRedirect();
        $responseUser->assertSessionHasNoErrors();
    }

    public function test_updating_own_record_with_same_curp_and_clave_passes_validation(): void
    {
        $curp = 'OWNCURP12345678901';
        $clave = 'OWNCLAV12345678901';

        $promovido = Promovido::create([
            'nombre' => 'Original',
            'apellidos' => 'Test',
            'curp' => $curp,
            'clave_elector' => $clave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'presidente_id' => $this->presidente1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responsePromovido = $this->actingAs($this->promotor1)->put("/promovidos/{$promovido->id}", [
            'nombre' => 'Actualizado',
            'apellidos' => 'Test',
            'curp' => $curp,
            'clave_elector' => $clave,
            'seccion_electoral' => '100',
            'colonia' => 'Centro',
            'promotor_id' => $this->promotor1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responsePromovido->assertRedirect();
        $responsePromovido->assertSessionHasNoErrors();

        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'curp' => $curp,
            'clave_electoral' => $clave,
            'parent_id' => $this->operador1->id,
            'presidente_id' => $this->presidente1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $responsePromotor = $this->actingAs($this->operador1)->put("/promotores/{$promotor->id}", [
            'nombre' => 'Promotor Actualizado',
            'apellidos' => 'Test',
            'curp' => $curp,
            'clave_electoral' => $clave,
            'parent_id' => $this->operador1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $responsePromotor->assertRedirect();
        $responsePromotor->assertSessionHasNoErrors();
    }
}
