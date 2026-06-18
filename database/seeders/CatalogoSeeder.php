<?php

namespace Database\Seeders;

use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Database\Seeder;

class CatalogoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            1 => ['secciones' => [91, 92, 96, 98, 109, 110, 114], 'total' => 400],
            2 => ['secciones' => [112, 113, 973, 975, 980], 'total' => 1000],
            3 => ['secciones' => [118, 119], 'total' => 800],
            4 => ['secciones' => [972, 974, 976, 978, 979], 'total' => 600],
            5 => ['secciones' => [121, 122, 123, 977, 981], 'total' => 700],
            6 => ['secciones' => [115, 120], 'total' => 500],
            7 => ['secciones' => [116, 117], 'total' => 450],
            8 => ['secciones' => [105, 106, 107, 108, 111], 'total' => 900],
            9 => ['secciones' => [93, 94, 95, 97, 99, 100, 101, 102, 103, 104], 'total' => 1200],
        ];

        foreach ($data as $demarcacionId => $info) {
            $demarcacion = Demarcacion::updateOrCreate(
                ['id' => $demarcacionId],
                [
                    'nombre' => "Demarcación $demarcacionId",
                    'total_votantes' => $info['total']
                ]
            );

            foreach ($info['secciones'] as $numero) {
                SeccionElectoral::updateOrCreate(
                    [
                        'numero' => (string)$numero,
                        'demarcacion_id' => $demarcacion->id
                    ]
                );
            }
        }
    }
}
