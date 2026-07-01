<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class MexicoStatesAndMunicipalitiesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = database_path('mexico.json');

        if (!File::exists($jsonPath)) {
            $this->command->error("El archivo mexico.json no existe en la carpeta database/. Por favor descárgalo primero.");
            return;
        }

        $jsonString = File::get($jsonPath);
        $data = json_decode($jsonString, true);

        if (!$data) {
            $this->command->error("El archivo mexico.json no tiene un formato JSON válido.");
            return;
        }

        $this->command->info('Iniciando importación de Estados y Municipios de México...');
        $this->command->getOutput()->progressStart(count($data));

        DB::beginTransaction();

        try {
            foreach ($data as $estadoNombre => $municipios) {
                // Insertar o obtener el Estado
                $state = DB::table('states')->where('nombre', $estadoNombre)->first();
                
                if (!$state) {
                    $stateId = DB::table('states')->insertGetId([
                        'nombre' => $estadoNombre,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $stateId = $state->id;
                }

                // Preparar municipios en bloque para este estado
                $municipiosParaInsertar = [];
                $nombresExistentes = DB::table('municipalities')
                    ->where('state_id', $stateId)
                    ->pluck('nombre')
                    ->toArray();

                foreach ($municipios as $muniNombre) {
                    if (!in_array($muniNombre, $nombresExistentes)) {
                        $municipiosParaInsertar[] = [
                            'state_id' => $stateId,
                            'nombre' => $muniNombre,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }

                // Insertar en bloque
                if (!empty($municipiosParaInsertar)) {
                    // Dividimos en trozos por si son demasiados, aunque 200 por estado es seguro
                    foreach (array_chunk($municipiosParaInsertar, 100) as $chunk) {
                        DB::table('municipalities')->insert($chunk);
                    }
                }

                $this->command->getOutput()->progressAdvance();
            }

            DB::commit();
            $this->command->getOutput()->progressFinish();
            $this->command->info('¡Estados y Municipios importados correctamente!');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Ocurrió un error al importar: ' . $e->getMessage());
        }
    }
}
