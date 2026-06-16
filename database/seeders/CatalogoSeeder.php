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
            1 => [91, 92, 96, 98, 109, 110, 114],
            2 => [112, 113, 973, 975, 980],
            3 => [118, 119],
            4 => [972, 974, 976, 978, 979],
            5 => [121, 122, 123, 977, 981],
            6 => [115, 120],
            7 => [116, 117],
            8 => [105, 106, 107, 108, 111],
            9 => [93, 94, 95, 97, 99, 100, 101, 102, 103, 104],
        ];

        foreach ($data as $demarcacionId => $secciones) {
            $demarcacion = Demarcacion::updateOrCreate(
                ['id' => $demarcacionId],
                ['nombre' => "Demarcación $demarcacionId"]
            );

            foreach ($secciones as $numero) {
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
