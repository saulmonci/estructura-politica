<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PromovidoCrudTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected Demarcacion $demarcacion;
    protected User $presidente;
    protected User $promotor;

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

        $this->promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $this->presidente->id,
            'presidente_id' => $this->presidente->id,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);
    }

    public function test_guest_cannot_access_promovidos(): void
    {
        $this->get('/promovidos')->assertRedirect('/');
    }

    public function test_promotor_can_list_promovidos_json(): void
    {
        Promovido::create([
            'nombre' => 'María',
            'apellidos' => 'López',
            'promotor_id' => $this->promotor->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);

        $response = $this->actingAs($this->promotor)->getJson('/promovidos');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'total',
                'current_page',
            ]);
    }

    public function test_promotor_can_create_promovido_with_all_attachments(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('foto_promovido.jpg');
        $ineFrente = UploadedFile::fake()->image('ine_frente.png');
        $ineReverso = UploadedFile::fake()->image('ine_reverso.png');

        $response = $this->actingAs($this->promotor)->post('/promovidos', [
            'nombre' => 'Ana',
            'apellidos' => 'García',
            'curp' => 'GARA900101MDFRRN01',
            'clave_elector' => 'GRAN90010118M100',
            'telefono' => '3111112233',
            'demarcacion_id' => $this->demarcacion->id,
            'seccion_electoral' => '101',
            'colonia' => 'Centro',
            'calle' => 'Hidalgo',
            'numero' => '123',
            'codigo_postal' => '63000',
            'foto' => $foto,
            'ine_frente' => $ineFrente,
            'ine_reverso' => $ineReverso,
        ]);

        $response->assertRedirect();

        $promovido = Promovido::where('nombre', 'Ana')->where('apellidos', 'García')->first();
        $this->assertNotNull($promovido);
        $this->assertEquals($this->promotor->id, $promovido->promotor_id);
        $this->assertEquals($this->presidente->id, $promovido->presidente_id);

        $this->assertNotNull($promovido->foto);
        $this->assertNotNull($promovido->ine_frente);
        $this->assertNotNull($promovido->ine_reverso);

        Storage::disk('public')->assertExists($promovido->foto);
        Storage::disk('public')->assertExists($promovido->ine_frente);
        Storage::disk('public')->assertExists($promovido->ine_reverso);
    }

    public function test_updating_promovido_preserves_attachments_when_not_reuploaded(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('initial_foto.jpg');
        $promovido = Promovido::create([
            'nombre' => 'Luis',
            'apellidos' => 'Hernández',
            'promotor_id' => $this->promotor->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
            'foto' => $foto->store('fotos', 'public'),
        ]);

        $initialFoto = $promovido->foto;
        $this->assertNotNull($initialFoto);

        $response = $this->actingAs($this->promotor)->put("/promovidos/{$promovido->id}", [
            'nombre' => 'Luis Alberto',
            'apellidos' => 'Hernández',
            'promotor_id' => $this->promotor->id,
        ]);

        $response->assertRedirect();
        $promovido->refresh();
        $this->assertEquals('Luis Alberto', $promovido->nombre);
        $this->assertEquals($initialFoto, $promovido->foto);
    }

    public function test_promotor_can_soft_delete_and_restore_promovido(): void
    {
        $promovido = Promovido::create([
            'nombre' => 'Elena',
            'apellidos' => 'Ríos',
            'promotor_id' => $this->promotor->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);

        // Soft delete
        $delRes = $this->actingAs($this->promotor)->delete("/promovidos/{$promovido->id}");
        $delRes->assertRedirect();
        $this->assertSoftDeleted('promovidos', ['id' => $promovido->id]);

        // Verificamos que el presidente puede listar eliminados con trashed=1
        $trashedRes = $this->actingAs($this->presidente)->getJson('/promovidos?trashed=1');
        $trashedRes->assertOk();
        $ids = collect($trashedRes->json('data'))->pluck('id')->toArray();
        $this->assertContains($promovido->id, $ids);

        // Restaurar
        $restRes = $this->actingAs($this->presidente)->post("/promovidos/{$promovido->id}/restore");
        $restRes->assertRedirect();
        $this->assertNotSoftDeleted('promovidos', ['id' => $promovido->id]);
    }
}
