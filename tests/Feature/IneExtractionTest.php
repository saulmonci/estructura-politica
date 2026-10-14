<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Demarcacion;
use App\Models\Municipality;
use App\Models\State;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IneExtractionTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $state = State::create(['nombre' => 'Nayarit']);
        $municipality = Municipality::create(['nombre' => 'Tepic', 'state_id' => $state->id]);
        $demarcacion = Demarcacion::create(['nombre' => 'Demarcación 1', 'municipality_id' => $municipality->id]);

        $this->user = User::factory()->create([
            'role' => UserRole::PRESIDENTE,
            'state_id' => $state->id,
            'municipality_id' => $municipality->id,
        ]);

        Config::set('services.gemini.api_key', 'fake-gemini-key');
    }

    public function test_rejects_ine_with_emission_2016(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'nombre' => 'JUAN CARLOS',
                                        'apellidos' => 'PEREZ LOPEZ',
                                        'curp' => 'PELJ900101HDFRRN01',
                                        'clave_elector' => 'PELJ90010101M100',
                                        'anio_emision' => 2016,
                                        'vigencia' => 2026,
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('ine_2016.jpg');

        $response = $this->actingAs($this->user)->postJson('/extract-ine', [
            'ine_image' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'error' => true,
            'error_code' => 'INE_VENCIDA',
            'message' => 'INE VENCIDA NO VOTA',
            'anio_emision' => 2016,
        ]);
    }

    public function test_rejects_ine_with_emission_prior_to_2017(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'nombre' => 'MARIA',
                                        'apellidos' => 'GONZALEZ',
                                        'curp' => 'GOMA850202MDFRRN02',
                                        'clave_elector' => 'GOMA85020202M200',
                                        'anio_emision' => 2014,
                                        'vigencia' => 2024,
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('ine_2014.jpg');

        $response = $this->actingAs($this->user)->postJson('/extract-ine', [
            'ine_image' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'error_code' => 'INE_VENCIDA',
            'message' => 'INE VENCIDA NO VOTA',
            'anio_emision' => 2014,
        ]);
    }

    public function test_rejects_ine_inferred_from_vigencia_2026(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'nombre' => 'PEDRO',
                                        'apellidos' => 'RAMIREZ',
                                        'curp' => 'RAPE880303HDFRRN03',
                                        'clave_elector' => 'RAPE88030303M300',
                                        'vigencia' => 2026,
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('ine_vigencia_2026.jpg');

        $response = $this->actingAs($this->user)->postJson('/extract-ine', [
            'ine_image' => $file,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'success' => false,
            'error_code' => 'INE_VENCIDA',
            'message' => 'INE VENCIDA NO VOTA',
            'anio_emision' => 2016,
        ]);
    }

    public function test_accepts_ine_with_emission_2017(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'nombre' => 'ANA',
                                        'apellidos' => 'HERNANDEZ',
                                        'curp' => 'HEAN950404MDFRRN04',
                                        'clave_elector' => 'HEAN95040404M400',
                                        'anio_emision' => 2017,
                                        'vigencia' => 2027,
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('ine_2017.jpg');

        $response = $this->actingAs($this->user)->postJson('/extract-ine', [
            'ine_image' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'nombre' => 'ANA',
                'apellidos' => 'HERNANDEZ',
                'anio_emision' => 2017,
                'vigencia' => 2027,
            ],
        ]);
    }

    public function test_accepts_ine_with_emission_2021(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'nombre' => 'CARLOS',
                                        'apellidos' => 'SANCHEZ',
                                        'curp' => 'SACA990505HDFRRN05',
                                        'clave_elector' => 'SACA99050505M500',
                                        'anio_emision' => 2021,
                                        'vigencia' => 2031,
                                    ]),
                                ],
                            ],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $file = UploadedFile::fake()->image('ine_2021.jpg');

        $response = $this->actingAs($this->user)->postJson('/extract-ine', [
            'ine_image' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'nombre' => 'CARLOS',
                'anio_emision' => 2021,
            ],
        ]);
    }
}
