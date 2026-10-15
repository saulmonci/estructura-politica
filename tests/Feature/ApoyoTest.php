<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Apoyo;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\Promovido;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApoyoTest extends TestCase
{
    use RefreshDatabase;

    protected State $state;
    protected Municipality $municipality;
    protected Demarcacion $demarcacion;
    protected User $presidente;
    protected User $promotor;
    protected Promovido $promovido;

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

        $this->promovido = Promovido::create([
            'nombre' => 'Juan',
            'apellidos' => 'Pérez',
            'promotor_id' => $this->promotor->id,
            'presidente_id' => $this->presidente->id,
            'demarcacion_id' => $this->demarcacion->id,
        ]);
    }

    public function test_can_create_apoyo_for_promovido_with_evidence_file(): void
    {
        Storage::fake('public');

        $evidenceFile = UploadedFile::fake()->create('comprobante.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->presidente)->post("/promovidos/{$this->promovido->id}/apoyos", [
            'fecha' => '2026-10-14',
            'tipo_apoyo' => 'Despensa',
            'descripcion' => 'Entrega de apoyo alimentario',
            'estado' => 'Entregado',
            'cantidad_monetaria' => 250.50,
            'evidencia_file' => $evidenceFile,
        ]);

        $response->assertCreated();

        $apoyo = Apoyo::where('promovido_id', $this->promovido->id)->first();

        $this->assertNotNull($apoyo);
        $this->assertEquals('Despensa', $apoyo->tipo_apoyo);
        $this->assertEquals(250.50, (float) $apoyo->cantidad_monetaria);
        $this->assertNotNull($apoyo->evidencia);

        Storage::disk('public')->assertExists($apoyo->evidencia);
    }

    public function test_can_list_apoyos_for_promovido(): void
    {
        Apoyo::create([
            'promovido_id' => $this->promovido->id,
            'presidente_id' => $this->presidente->id,
            'fecha' => '2026-10-10',
            'tipo_apoyo' => 'Silla de ruedas',
            'estado' => 'Pendiente',
        ]);

        $response = $this->actingAs($this->presidente)->getJson("/promovidos/{$this->promovido->id}/apoyos");

        $response->assertOk()
            ->assertJsonCount(1);
    }

    public function test_can_update_and_delete_apoyo(): void
    {
        $apoyo = Apoyo::create([
            'promovido_id' => $this->promovido->id,
            'presidente_id' => $this->presidente->id,
            'fecha' => '2026-10-10',
            'tipo_apoyo' => 'Medicamento',
            'estado' => 'Pendiente',
        ]);

        // Update
        $updateRes = $this->actingAs($this->presidente)->putJson("/apoyos/{$apoyo->id}", [
            'fecha' => '2026-10-11',
            'tipo_apoyo' => 'Medicamento Especializado',
            'estado' => 'Entregado',
            'cantidad_monetaria' => 800,
        ]);

        $updateRes->assertOk();
        $apoyo->refresh();
        $this->assertEquals('Medicamento Especializado', $apoyo->tipo_apoyo);
        $this->assertEquals('Entregado', $apoyo->estado);

        // Delete
        $deleteRes = $this->actingAs($this->presidente)->deleteJson("/apoyos/{$apoyo->id}");
        $deleteRes->assertOk();
        $this->assertSoftDeleted('apoyos', ['id' => $apoyo->id]);
    }

    public function test_other_presidente_cannot_access_or_modify_apoyo(): void
    {
        $otherPresidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $this->state->id,
            'municipality_id' => $this->municipality->id,
        ]);

        $apoyo = Apoyo::create([
            'promovido_id' => $this->promovido->id,
            'presidente_id' => $this->presidente->id,
            'fecha' => '2026-10-10',
            'tipo_apoyo' => 'Lente',
            'estado' => 'Pendiente',
        ]);

        // Trying to view apoyos of promovido of another presidente
        $this->actingAs($otherPresidente)->getJson("/promovidos/{$this->promovido->id}/apoyos")
            ->assertForbidden();

        // Trying to update
        $this->actingAs($otherPresidente)->putJson("/apoyos/{$apoyo->id}", [
            'fecha' => '2026-10-12',
            'tipo_apoyo' => 'Hackeado',
            'estado' => 'Cancelado',
        ])->assertForbidden();

        // Trying to delete
        $this->actingAs($otherPresidente)->deleteJson("/apoyos/{$apoyo->id}")
            ->assertForbidden();
    }
}
