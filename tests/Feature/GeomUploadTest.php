<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\SeccionElectoral;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GeomUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Replica los headers que manda axios en el frontend real (GeomUploadModal.jsx):
        // Accept: application/json por defecto de axios, X-Requested-With por bootstrap.js.
        $this->withHeaders([
            'Accept' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
        ]);
    }

    private function validPolygonGeoJson(): array
    {
        return [
            'type' => 'Polygon',
            'coordinates' => [[
                [-105.28, 20.78],
                [-105.26, 20.74],
                [-105.24, 20.72],
                [-105.28, 20.78],
            ]],
        ];
    }

    private function validMultiPolygonGeoJson(): array
    {
        return [
            'type' => 'MultiPolygon',
            'coordinates' => [
                [[
                    [-105.28, 20.78],
                    [-105.26, 20.74],
                    [-105.24, 20.72],
                    [-105.28, 20.78],
                ]],
                [[
                    [-105.10, 20.90],
                    [-105.08, 20.88],
                    [-105.06, 20.86],
                    [-105.10, 20.90],
                ]],
            ],
        ];
    }

    private function fakeGeojsonFile(array $data, string $name = 'capa.geojson'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, json_encode($data));
    }

    private function seedMunicipio(string $nombre = 'Bahía de Banderas'): array
    {
        $state = State::create(['nombre' => 'Nayarit_'.uniqid()]);
        $muni = Municipality::create([
            'state_id' => $state->id,
            'nombre' => $nombre.'_'.uniqid(),
            'lat' => 20.8,
            'lng' => -105.25,
            'zoom' => 11,
        ]);

        return [$state, $muni];
    }

    private function seedDemarcacionYSeccion(Municipality $muni, State $state, int $demId): array
    {
        $dem = Demarcacion::create([
            'id' => $demId,
            'nombre' => "Demarcación {$demId}",
            'meta' => 400,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);
        $sec = SeccionElectoral::create([
            'numero' => (string) (1000 + $demId),
            'demarcacion_id' => $dem->id,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
            'meta' => 100,
        ]);

        return [$dem, $sec];
    }

    public function test_guest_cannot_upload_geom()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);

        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $response = $this->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);
        // Esta app renderiza excepciones como JSON solo para rutas /api/* (bootstrap/app.php
        // shouldRenderJsonWhen); en rutas web un guest siempre es redirigido, igual que /mapa
        // (ver MapaTest::test_guest_cannot_access_mapa).
        $response->assertRedirect('/');
    }

    public function test_role_without_access_cannot_upload_geom()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);

        $promotor = User::factory()->create(['role' => UserRole::PROMOTOR]);
        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());

        $response = $this->actingAs($promotor)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);
        $response->assertStatus(403);
    }

    public function test_presidente_can_upload_valid_polygon_geom_for_demarcacion()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        $row = DB::selectOne('SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) as g FROM demarcaciones WHERE id = ?', [$dem->id]);
        $this->assertNotNull($row->g);
        $geom = json_decode($row->g, true);
        $this->assertEquals('Polygon', $geom['type']);
    }

    public function test_upload_rejects_multipolygon_for_demarcacion()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = $this->fakeGeojsonFile($this->validMultiPolygonGeoJson());
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['success' => false]);
    }

    public function test_seccion_accepts_polygon_and_multipolygon()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        // Polygon -> debe envolverse en ST_Multi y quedar como MultiPolygon en BD
        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $response = $this->actingAs($presidente)->post("/secciones/{$sec->id}/geom", ['geojson' => $file]);
        $response->assertStatus(200);

        $row = DB::selectOne('SELECT ST_GeometryType(geom) as t FROM secciones_electorales WHERE id = ?', [$sec->id]);
        $this->assertEquals('ST_MultiPolygon', $row->t);

        // MultiPolygon directo también debe aceptarse
        $file2 = $this->fakeGeojsonFile($this->validMultiPolygonGeoJson());
        $response2 = $this->actingAs($presidente)->post("/secciones/{$sec->id}/geom", ['geojson' => $file2]);
        $response2->assertStatus(200);

        $row2 = DB::selectOne('SELECT ST_GeometryType(geom) as t FROM secciones_electorales WHERE id = ?', [$sec->id]);
        $this->assertEquals('ST_MultiPolygon', $row2->t);
    }

    public function test_upload_accepts_feature_and_featurecollection_wrapped_geometry()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $feature = ['type' => 'Feature', 'properties' => [], 'geometry' => $this->validPolygonGeoJson()];
        $file = $this->fakeGeojsonFile($feature);
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);
        $response->assertStatus(200);

        $featureCollection = [
            'type' => 'FeatureCollection',
            'features' => [
                ['type' => 'Feature', 'properties' => [], 'geometry' => $this->validPolygonGeoJson()],
            ],
        ];
        $file2 = $this->fakeGeojsonFile($featureCollection);
        $response2 = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file2]);
        $response2->assertStatus(200);
    }

    public function test_upload_rejects_featurecollection_with_zero_or_multiple_features()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $empty = ['type' => 'FeatureCollection', 'features' => []];
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", [
            'geojson' => $this->fakeGeojsonFile($empty),
        ]);
        $response->assertStatus(422);

        $multiple = [
            'type' => 'FeatureCollection',
            'features' => [
                ['type' => 'Feature', 'properties' => [], 'geometry' => $this->validPolygonGeoJson()],
                ['type' => 'Feature', 'properties' => [], 'geometry' => $this->validPolygonGeoJson()],
            ],
        ];
        $response2 = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", [
            'geojson' => $this->fakeGeojsonFile($multiple),
        ]);
        $response2->assertStatus(422);
    }

    public function test_upload_rejects_malformed_json()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = UploadedFile::fake()->createWithContent('capa.geojson', 'esto no es json');
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);

        $response->assertStatus(422);
    }

    public function test_upload_rejects_invalid_geometry_structure()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        // Sin coordinates
        $file = $this->fakeGeojsonFile(['type' => 'Polygon']);
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);
        $response->assertStatus(422);

        // Coordinates válido a nivel PHP (array no vacío) pero estructuralmente inválido para
        // PostGIS: un Polygon espera un array de anillos, no una posición plana.
        $badRing = ['type' => 'Polygon', 'coordinates' => [0, 0]];
        $file2 = $this->fakeGeojsonFile($badRing);
        $response2 = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file2]);
        $response2->assertStatus(422);
        $this->assertFalse($response2->json('success'));
    }

    public function test_presidente_cannot_upload_geom_outside_scope()
    {
        [$state, $muni1] = $this->seedMunicipio('Bahía de Banderas');
        [$dem1, $sec1] = $this->seedDemarcacionYSeccion($muni1, $state, 1);

        $muni2 = Municipality::create([
            'state_id' => $state->id,
            'nombre' => 'Tepic_'.uniqid(),
            'lat' => 21.5,
            'lng' => -104.89,
            'zoom' => 12,
        ]);
        [$dem2, $sec2] = $this->seedDemarcacionYSeccion($muni2, $state, 2);

        $presidenteMuni1 = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni1->id,
            'state_id' => $state->id,
        ]);

        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $response = $this->actingAs($presidenteMuni1)->post("/demarcaciones/{$dem2->id}/geom", ['geojson' => $file]);
        $response->assertStatus(404);

        $file2 = $this->fakeGeojsonFile($this->validMultiPolygonGeoJson());
        $response2 = $this->actingAs($presidenteMuni1)->post("/secciones/{$sec2->id}/geom", ['geojson' => $file2]);
        $response2->assertStatus(404);
    }

    public function test_uploaded_geom_is_served_correctly_by_mapa_endpoint()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file])->assertStatus(200);

        $response = $this->actingAs($presidente)->get('/mapa');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Mapa')
            ->has('demarcaciones', 1)
            ->where('demarcaciones.0.id', $dem->id)
            ->whereType('demarcaciones.0.geojson', 'string')
        );

        // Confirma que el geojson servido decodifica al mismo Polygon subido (round-trip 4326 -> 32613 -> 4326)
        $row = DB::selectOne('SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)) as g FROM demarcaciones WHERE id = ?', [$dem->id]);
        $geom = json_decode($row->g, true);
        $this->assertEquals('Polygon', $geom['type']);
    }

    public function test_upload_creates_activity_log_entry()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = $this->fakeGeojsonFile($this->validPolygonGeoJson());
        $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file])->assertStatus(200);

        $log = ActivityLog::where('model_type', Demarcacion::class)
            ->where('model_id', $dem->id)
            ->where('action', 'updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertStringContainsString('Geometría cargada', $log->changed_data['geom']);
    }

    public function test_upload_rejects_file_without_geojson_or_json_extension()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = UploadedFile::fake()->createWithContent('capa.txt', json_encode($this->validPolygonGeoJson()));
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);

        $response->assertStatus(422);
    }

    public function test_upload_rejects_oversized_file()
    {
        [$state, $muni] = $this->seedMunicipio();
        [$dem, $sec] = $this->seedDemarcacionYSeccion($muni, $state, 1);
        $presidente = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'municipality_id' => $muni->id,
            'state_id' => $state->id,
        ]);

        $file = UploadedFile::fake()->create('grande.geojson', 5121); // KB, 1 KB sobre el límite
        $response = $this->actingAs($presidente)->post("/demarcaciones/{$dem->id}/geom", ['geojson' => $file]);

        $response->assertStatus(422);
    }
}
