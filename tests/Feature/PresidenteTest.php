<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PresidenteTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected User $superuser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->state = State::create(['nombre' => 'Nayarit']);
        $this->municipality = Municipality::create(['nombre' => 'Tepic', 'state_id' => $this->state->id]);

        $this->superuser = User::factory()->create([
            'role' => UserRole::SUPERUSER,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);
    }

    public function test_guest_cannot_access_presidentes(): void
    {
        $this->get('/presidentes')->assertRedirect('/');
    }

    public function test_unauthorized_role_cannot_access_presidentes(): void
    {
        $promotor = User::factory()->create(['role' => UserRole::PROMOTOR]);
        $this->actingAs($promotor)->get('/presidentes')->assertForbidden();
    }

    public function test_superuser_can_list_presidentes_json(): void
    {
        User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'nombre' => 'Alfonso',
            'apellidos' => 'Durazo',
        ]);

        $response = $this->actingAs($this->superuser)->getJson('/presidentes');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'total',
                'current_page',
            ]);
    }

    public function test_superuser_can_create_presidente_with_attachments(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('presidente_foto.jpg');
        $ineFrente = UploadedFile::fake()->image('ine_frente.png');
        $ineReverso = UploadedFile::fake()->image('ine_reverso.png');

        $response = $this->actingAs($this->superuser)->post('/presidentes', [
            'nombre' => 'Roberto',
            'apellidos' => 'Sandoval',
            'curp' => 'SANR800101MDFRRN09',
            'clave_electoral' => 'SNDR80010118M900',
            'telefono' => '3112223344',
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'estado' => true,
            'foto' => $foto,
            'ine_frente' => $ineFrente,
            'ine_reverso' => $ineReverso,
        ]);

        $response->assertRedirect();

        $presidente = User::where('nombre', 'Roberto')->where('apellidos', 'Sandoval')->first();
        $this->assertNotNull($presidente);
        $this->assertEquals(UserRole::PRESIDENTE, $presidente->role);
        $this->assertNotNull($presidente->foto);
        $this->assertNotNull($presidente->ine_frente);
        $this->assertNotNull($presidente->ine_reverso);

        Storage::disk('public')->assertExists($presidente->foto);
        Storage::disk('public')->assertExists($presidente->ine_frente);
        Storage::disk('public')->assertExists($presidente->ine_reverso);
    }

    public function test_updating_presidente_preserves_attachments(): void
    {
        Storage::fake('public');

        $foto = UploadedFile::fake()->image('initial_pres.jpg');
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
            'nombre' => 'Original',
            'apellidos' => 'Presidente',
            'foto' => $foto->store('fotos', 'public'),
        ]);

        $initialFoto = $presidente->foto;
        $this->assertNotNull($initialFoto);

        $response = $this->actingAs($this->superuser)->put("/presidentes/{$presidente->id}", [
            'nombre' => 'Modificado',
            'apellidos' => 'Presidente',
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $response->assertRedirect();
        $presidente->refresh();
        $this->assertEquals('Modificado', $presidente->nombre);
        $this->assertEquals($initialFoto, $presidente->foto);
    }

    public function test_superuser_can_soft_delete_and_restore_presidente(): void
    {
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        // Soft delete
        $delRes = $this->actingAs($this->superuser)->delete("/presidentes/{$presidente->id}");
        $delRes->assertRedirect();
        $this->assertSoftDeleted('users', ['id' => $presidente->id]);

        // List with trashed=1
        $trashedRes = $this->actingAs($this->superuser)->getJson('/presidentes?trashed=1');
        $trashedRes->assertOk();
        $ids = collect($trashedRes->json('data'))->pluck('id')->toArray();
        $this->assertContains($presidente->id, $ids);

        // Restore
        $restRes = $this->actingAs($this->superuser)->post("/presidentes/{$presidente->id}/restore");
        $restRes->assertRedirect();
        $this->assertNotSoftDeleted('users', ['id' => $presidente->id]);
    }
}
