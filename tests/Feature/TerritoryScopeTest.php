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

class TerritoryScopeTest extends TestCase
{
    use RefreshDatabase;

    protected State $state1;
    protected State $state2;
    protected Municipality $muni1;
    protected Municipality $muni2;
    protected Demarcacion $demarcacion1;
    protected Demarcacion $demarcacion2;

    protected function setUp(): void
    {
        parent::setUp();

        // Crear dos estados distintos
        $this->state1 = State::create(['nombre' => 'Estado 1']);
        $this->state2 = State::create(['nombre' => 'Estado 2']);

        // Crear dos municipios en distintos estados
        $this->muni1 = Municipality::create(['nombre' => 'Municipio A', 'state_id' => $this->state1->id]);
        $this->muni2 = Municipality::create(['nombre' => 'Municipio B', 'state_id' => $this->state2->id]);

        // Crear dos demarcaciones en distintos municipios
        $this->demarcacion1 = Demarcacion::create(['nombre' => 'Demarcación Alpha', 'municipality_id' => $this->muni1->id]);
        $this->demarcacion2 = Demarcacion::create(['nombre' => 'Demarcación Beta', 'municipality_id' => $this->muni2->id]);
    }

    public function test_superuser_sees_all_promovidos()
    {
        // Crear promovidos en distintos territorios
        $p1 = Promovido::factory()->create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $p2 = Promovido::factory()->create([
            'nombre' => 'Maria',
            'apellidos' => 'Gomez',
            'demarcacion_id' => $this->demarcacion2->id,
        ]);

        $superuser = User::factory()->create([
            'role' => UserRole::SUPERUSER,
            'scope_level' => 'estatal',
            'state_id' => null,
            'municipality_id' => null,
            'demarcacion_id' => null,
        ]);

        $this->actingAs($superuser);

        $results = Promovido::all();
        $this->assertCount(2, $results);
    }

    public function test_estatal_user_sees_only_promovidos_from_their_state()
    {
        // Crear promovidos en distintos territorios
        $p1 = Promovido::factory()->create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $p2 = Promovido::factory()->create([
            'nombre' => 'Maria',
            'apellidos' => 'Gomez',
            'demarcacion_id' => $this->demarcacion2->id,
        ]);

        // Usuario estatal limitado al Estado 1
        $estatalUser = User::factory()->create([
            'role' => UserRole::ADMIN,
            'scope_level' => 'estatal',
            'state_id' => $this->state1->id,
            'municipality_id' => null,
            'demarcacion_id' => null,
        ]);

        $this->actingAs($estatalUser);

        $results = Promovido::all();
        $this->assertCount(1, $results);
        $this->assertEquals($p1->id, $results->first()->id);
    }

    public function test_municipal_user_sees_only_promovidos_from_their_municipality()
    {
        // Crear promovidos en distintos municipios
        $p1 = Promovido::factory()->create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $p2 = Promovido::factory()->create([
            'nombre' => 'Maria',
            'apellidos' => 'Gomez',
            'demarcacion_id' => $this->demarcacion2->id,
        ]);

        // Usuario municipal limitado al Municipio A
        $municipalUser = User::factory()->create([
            'role' => UserRole::ADMIN,
            'scope_level' => 'municipal',
            'state_id' => $this->state1->id,
            'municipality_id' => $this->muni1->id,
            'demarcacion_id' => null,
        ]);

        $this->actingAs($municipalUser);

        $results = Promovido::all();
        $this->assertCount(1, $results);
        $this->assertEquals($p1->id, $results->first()->id);
    }

    public function test_demarcacion_user_sees_only_promovidos_from_their_demarcation()
    {
        // Crear promovidos en distintas demarcaciones
        $p1 = Promovido::factory()->create([
            'nombre' => 'Juan',
            'apellidos' => 'Perez',
            'demarcacion_id' => $this->demarcacion1->id,
        ]);
        $p2 = Promovido::factory()->create([
            'nombre' => 'Maria',
            'apellidos' => 'Gomez',
            'demarcacion_id' => $this->demarcacion2->id,
        ]);

        // Usuario demarcación limitado a Demarcación Alpha
        $demarcacionUser = User::factory()->create([
            'role' => UserRole::ADMIN,
            'scope_level' => 'demarcacion',
            'state_id' => $this->state1->id,
            'municipality_id' => $this->muni1->id,
            'demarcacion_id' => $this->demarcacion1->id,
        ]);

        $this->actingAs($demarcacionUser);

        $results = Promovido::all();
        $this->assertCount(1, $results);
        $this->assertEquals($p1->id, $results->first()->id);
    }
}
