<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Promovido;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Enums\UserRole;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Sembrar Catálogos de Demarcación y Sección
        $this->call([
            CatalogoSeeder::class,
            TerritoryPresidentesSeeder::class,
            TerritoryAdminsSeeder::class, // In case this isn't there already
        ]);

        // 1. Crear Presidente
        $presidente = User::updateOrCreate(
            ['email' => 'presidente@estructura.com'],
            [
                'name' => 'Presidente Electoral',
                'password' => Hash::make('secret'),
                'role' => UserRole::PRESIDENTE,
                'parent_id' => null,
            ]
        );
        $presidente->presidente_id = $presidente->id;
        $presidente->save();

        // 2. Crear 2 RDs asignados a ese Presidente
        $rds = [];
        for ($i = 1; $i <= 2; $i++) {
            $rds[] = User::updateOrCreate(
                ['email' => "rd$i@estructura.com"],
                [
                    'name' => "Responsable de Distrito $i",
                    'password' => Hash::make('secret'),
                    'role' => UserRole::RD,
                    'parent_id' => $presidente->id,
                    'presidente_id' => $presidente->id,
                ]
            );
        }

        // 3. Crear 4 Operadores (2 por cada RD)
        $operadores = [];
        $operadorCount = 1;
        foreach ($rds as $rd) {
            for ($o = 1; $o <= 2; $o++) {
                $operadores[] = User::updateOrCreate(
                    ['email' => "operador$operadorCount@estructura.com"],
                    [
                        'name' => "Operador Político $operadorCount",
                        'password' => Hash::make('secret'),
                        'role' => UserRole::OPERADOR,
                        'parent_id' => $rd->id,
                        'presidente_id' => $presidente->id,
                    ]
                );
                $operadorCount++;
            }
        }

        // 4. Crear 8 Promotores (2 por cada Operador)
        $promotores = [];
        $promotorCount = 1;
        foreach ($operadores as $operador) {
            for ($p = 1; $p <= 2; $p++) {
                $promotores[] = User::updateOrCreate(
                    ['email' => "promotor$promotorCount@estructura.com"],
                    [
                        'name' => "Promotor Electoral $promotorCount",
                        'password' => Hash::make('secret'),
                        'role' => UserRole::PROMOTOR,
                        'parent_id' => $operador->id,
                        'presidente_id' => $presidente->id,
                    ]
                );
                $promotorCount++;
            }
        }

        // 5. Crear 40 Promovidos distribuidos entre los promotores
        $colonias = ['Centro', 'Lomas Altas', 'San Rafael', 'Pedregal', 'Santa Cruz'];
        $secciones = ['0120', '0121', '0122', '0123', '0124'];

        $promovidoCount = 1;
        foreach ($promotores as $promotor) {
            // 5 promovidos por promotor (total 8 * 5 = 40 promovidos)
            for ($pr = 1; $pr <= 5; $pr++) {
                // Generar una clave de elector simulada única (18 caracteres)
                $claveElector = strtoupper(Str::random(6)) . rand(10, 99) . rand(10, 99) . rand(10, 99) . rand(10, 99) . strtoupper(Str::random(4));
                
                Promovido::create([
                    'nombre' => "Votante",
                    'apellidos' => "Promovido $promovidoCount",
                    'clave_elector' => $claveElector,
                    'telefono' => '55' . rand(10000000, 99999999),
                    'seccion_electoral' => $secciones[array_rand($secciones)],
                    'colonia' => $colonias[array_rand($colonias)],
                    'promotor_id' => $promotor->id,
                    'presidente_id' => $presidente->id,
                ]);
                $promovidoCount++;
            }
        }
    }
}
