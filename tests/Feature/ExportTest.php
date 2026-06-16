<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Promovido;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    private function parseCsvResponse($responseContent): array
    {
        // Eliminar BOM de UTF-8 si está presente
        $bom = chr(0xEF) . chr(0xBB) . chr(0xBF);
        if (str_starts_with($responseContent, $bom)) {
            $responseContent = substr($responseContent, 3);
        }
        
        $lines = explode("\n", trim($responseContent));
        $headerLine = array_shift($lines);
        if (!$headerLine) return [];
        
        $headers = str_getcsv($headerLine);
        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            $row = str_getcsv($line);
            if (count($row) === count($headers)) {
                $rows[] = array_combine($headers, $row);
            }
        }
        return $rows;
    }

    public function test_guest_cannot_export(): void
    {
        $this->get('/operadores/export')->assertRedirect('/');
        $this->get('/promotores/export')->assertRedirect('/');
        $this->get('/promovidos/export')->assertRedirect('/');
    }

    public function test_unauthorized_roles_cannot_export(): void
    {
        $operador = User::factory()->create(['role' => 'operador']);
        $promotor = User::factory()->create(['role' => 'promotor']);

        $this->actingAs($operador)->get('/operadores/export')->assertStatus(403);
        $this->actingAs($promotor)->get('/promovidos/export')->assertStatus(403);
    }

    public function test_rd_cannot_export_representantes(): void
    {
        $rd = User::factory()->create(['role' => 'rd', 'demarcacion' => '1']);

        $this->actingAs($rd)->get('/representantes/export')->assertStatus(403);
    }

    public function test_presidente_can_export_everything(): void
    {
        $presidente = User::factory()->create(['role' => 'presidente']);
        
        // Crear algunos registros de prueba
        User::factory()->create(['role' => 'rd', 'parent_id' => $presidente->id]);
        User::factory()->create(['role' => 'operador']);
        User::factory()->create(['role' => 'promotor']);

        $response = $this->actingAs($presidente)->get('/operadores/export');
        $response->assertStatus(200);
        $this->assertNotEmpty($response->streamedContent());
    }

    public function test_rd_without_demarcation_cannot_export(): void
    {
        $rd = User::factory()->create(['role' => 'rd', 'demarcacion' => null]);

        $this->actingAs($rd)->get('/operadores/export')
            ->assertStatus(403)
            ->assertSee('El RD no tiene una demarcación asignada.', false);
    }

    public function test_rd_can_only_export_subordinates_matching_demarcation(): void
    {
        // 1. Crear RDs
        $rd1 = User::factory()->create(['role' => 'rd', 'demarcacion' => '1', 'name' => 'RD 1']);
        $rd2 = User::factory()->create(['role' => 'rd', 'demarcacion' => '2', 'name' => 'RD 2']);

        // 2. Crear Operadores
        // Operador 1: Bajo RD 1, demarcación '1' (Debe ser exportable por RD 1)
        $op1 = User::factory()->create([
            'role' => 'operador',
            'parent_id' => $rd1->id,
            'demarcacion' => '1',
            'nombre' => 'Juan',
            'apellidos' => 'Perez'
        ]);
        
        // Operador 2: Bajo RD 1, pero demarcación '2' (No debe ser exportable por RD 1 por demarcación diferente)
        $op2 = User::factory()->create([
            'role' => 'operador',
            'parent_id' => $rd1->id,
            'demarcacion' => '2',
            'nombre' => 'Pedro',
            'apellidos' => 'Gomez'
        ]);

        // Operador 3: Bajo RD 2, demarcación '1' (No debe ser exportable por RD 1 por jerarquía diferente)
        $op3 = User::factory()->create([
            'role' => 'operador',
            'parent_id' => $rd2->id,
            'demarcacion' => '1',
            'nombre' => 'Lucas',
            'apellidos' => 'Alba'
        ]);

        // 3. Crear Promotores
        // Promotor 1: Bajo Op 1, demarcación '1' (Debe ser exportable por RD 1)
        $pr1 = User::factory()->create([
            'role' => 'promotor',
            'parent_id' => $op1->id,
            'demarcacion' => '1',
            'nombre' => 'Maria',
            'apellidos' => 'Diaz'
        ]);

        // Promotor 2: Bajo Op 1, demarcación '2' (No debe ser exportable)
        $pr2 = User::factory()->create([
            'role' => 'promotor',
            'parent_id' => $op1->id,
            'demarcacion' => '2',
            'nombre' => 'Clara',
            'apellidos' => 'Luna'
        ]);

        // Promotor 3: Bajo Op 3 (RD 2), demarcación '1' (No debe ser exportable)
        $pr3 = User::factory()->create([
            'role' => 'promotor',
            'parent_id' => $op3->id,
            'demarcacion' => '1',
            'nombre' => 'Sonia',
            'apellidos' => 'Rios'
        ]);

        // 4. Crear Promovidos
        // Promovido 1: Bajo Pr 1, demarcación '1' (Debe ser exportable)
        $pm1 = Promovido::factory()->create([
            'promotor_id' => $pr1->id,
            'demarcacion' => '1',
            'nombre' => 'Carlos',
            'apellidos' => 'Ruiz'
        ]);

        // Promovido 2: Bajo Pr 1, demarcación '2' (No debe ser exportable)
        $pm2 = Promovido::factory()->create([
            'promotor_id' => $pr1->id,
            'demarcacion' => '2',
            'nombre' => 'Ana',
            'apellidos' => 'Vega'
        ]);

        // Promovido 3: Bajo Pr 3, demarcación '1' (No debe ser exportable)
        $pm3 = Promovido::factory()->create([
            'promotor_id' => $pr3->id,
            'demarcacion' => '1',
            'nombre' => 'Beto',
            'apellidos' => 'Solis'
        ]);

        // --- VALIDAR EXPORTACIÓN DE OPERADORES ---
        $response = $this->actingAs($rd1)->get('/operadores/export');
        $response->assertStatus(200);
        $operadoresRows = $this->parseCsvResponse($response->streamedContent());
        
        $this->assertCount(1, $operadoresRows);
        $this->assertEquals('Juan', $operadoresRows[0]['Nombre']);
        $this->assertEquals('Perez', $operadoresRows[0]['Apellidos']);

        // --- VALIDAR EXPORTACIÓN DE PROMOTORES ---
        $response = $this->actingAs($rd1)->get('/promotores/export');
        $response->assertStatus(200);
        $promotoresRows = $this->parseCsvResponse($response->streamedContent());
        
        $this->assertCount(1, $promotoresRows);
        $this->assertEquals('Maria', $promotoresRows[0]['Nombre']);
        $this->assertEquals('Diaz', $promotoresRows[0]['Apellidos']);

        // --- VALIDAR EXPORTACIÓN DE PROMOVIDOS ---
        $response = $this->actingAs($rd1)->get('/promovidos/export');
        $response->assertStatus(200);
        $promovidosRows = $this->parseCsvResponse($response->streamedContent());
        
        $this->assertCount(1, $promovidosRows);
        $this->assertEquals('Carlos', $promovidosRows[0]['Nombre']);
        $this->assertEquals('Ruiz', $promovidosRows[0]['Apellidos']);
    }
}
