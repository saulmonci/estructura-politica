<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OperadorTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected Demarcacion $demarcacion;
    protected User $presidente;
    protected User $rd;

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
    }

    public function test_guest_cannot_access_operadores(): void
    {
        $this->get('/operadores')->assertRedirect('/');
    }

    public function test_unauthorized_role_cannot_access_operadores(): void
    {
        $promotor = User::factory()->create([
            'role' => UserRole::PROMOTOR,
            'parent_id' => $this->presidente->id,
            'presidente_id' => $this->presidente->id,
        ]);

        $this->actingAs($promotor)->get('/operadores')->assertForbidden();
    }

    public function test_presidente_can_list_operadores_json(): void
    {
        User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->rd->id,
            'presidente_id' => $this->presidente->id,
            'nombre' => 'Carlos',
            'apellidos' => 'Santana',
        ]);

        $response = $this->actingAs($this->presidente)
            ->getJson('/operadores');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'total',
                'current_page',
            ]);
    }

    public function test_presidente_can_create_operador_with_photo_and_ine_files(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('foto_perfil.jpg');
        $ineFrente = UploadedFile::fake()->image('ine_frente.png');
        $ineReverso = UploadedFile::fake()->image('ine_reverso.png');

        $response = $this->actingAs($this->presidente)->post('/operadores', [
            'nombre' => 'Pedro',
            'apellidos' => 'Infante',
            'telefono' => '3119876543',
            'demarcacion_id' => $this->demarcacion->id,
            'parent_id' => $this->rd->id,
            'estado' => true,
            'foto' => $foto,
            'ine_frente' => $ineFrente,
            'ine_reverso' => $ineReverso,
        ]);

        $response->assertRedirect();

        $operador = User::where('nombre', 'Pedro')->where('apellidos', 'Infante')->first();
        $this->assertNotNull($operador);
        $this->assertEquals(UserRole::OPERADOR, $operador->role);
        $this->assertNotNull($operador->foto);
        $this->assertNotNull($operador->ine_frente);
        $this->assertNotNull($operador->ine_reverso);

        Storage::disk('public')->assertExists($operador->foto);
        Storage::disk('public')->assertExists($operador->ine_frente);
        Storage::disk('public')->assertExists($operador->ine_reverso);
    }

    public function test_updating_operador_preserves_existing_photos_when_omitted(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('initial_foto.jpg');
        $operador = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->rd->id,
            'presidente_id' => $this->presidente->id,
            'nombre' => 'Original',
            'apellidos' => 'Operador',
            'foto' => $foto->store('fotos', 'public'),
        ]);

        $existingFotoPath = $operador->foto;
        $this->assertNotNull($existingFotoPath);

        // Actualizar sin enviar nuevo archivo de foto
        $response = $this->actingAs($this->presidente)->put("/operadores/{$operador->id}", [
            'nombre' => 'Actualizado',
            'apellidos' => 'Operador',
            'parent_id' => $this->rd->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);

        $response->assertRedirect();
        $operador->refresh();
        $this->assertEquals('Actualizado', $operador->nombre);
        $this->assertEquals($existingFotoPath, $operador->foto);
    }

    public function test_presidente_can_soft_delete_and_restore_operador(): void
    {
        $operador = User::factory()->create([
            'role' => UserRole::OPERADOR,
            'parent_id' => $this->rd->id,
            'presidente_id' => $this->presidente->id,
        ]);

        // Soft delete
        $deleteResponse = $this->actingAs($this->presidente)->delete("/operadores/{$operador->id}");
        $deleteResponse->assertRedirect();

        $this->assertSoftDeleted('users', ['id' => $operador->id]);

        // Query with trashed=1 returns it
        $trashedResponse = $this->actingAs($this->presidente)->getJson('/operadores?trashed=1');
        $trashedResponse->assertOk();
        $ids = collect($trashedResponse->json('data'))->pluck('id')->toArray();
        $this->assertContains($operador->id, $ids);

        // Normal query does not return it
        $normalResponse = $this->actingAs($this->presidente)->getJson('/operadores');
        $normalResponse->assertOk();
        $normalIds = collect($normalResponse->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($operador->id, $normalIds);

        // Restore
        $restoreResponse = $this->actingAs($this->presidente)->post("/operadores/{$operador->id}/restore");
        $restoreResponse->assertRedirect();

        $this->assertNotSoftDeleted('users', ['id' => $operador->id]);
    }
}
