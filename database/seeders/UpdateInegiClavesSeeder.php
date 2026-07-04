<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class UpdateInegiClavesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = database_path('inegi_claves.json');

        if (!File::exists($jsonPath)) {
            $this->command->error("El archivo inegi_claves.json no existe en la carpeta database/. Por favor asegúrate de tenerlo.");
            return;
        }

        $jsonString = File::get($jsonPath);
        $data = json_decode($jsonString, true);

        if (!$data) {
            $this->command->error("El archivo inegi_claves.json no tiene un formato JSON válido.");
            return;
        }

        $this->command->info('Iniciando actualización de Claves INEGI para Estados y Municipios...');
        $this->command->getOutput()->progressStart(count($data));

        DB::beginTransaction();

        try {
            foreach ($data as $estadoNombre => $estadoData) {
                // Remove accents or weird characters if needed to match database
                // Let's first try direct match
                $state = DB::table('states')->where('nombre', $estadoNombre)->first();
                
                // If not matched, try mapping known problematic names
                if (!$state) {
                    $mappedName = $this->mapStateName($estadoNombre);
                    $state = DB::table('states')->where('nombre', $mappedName)->first();
                }
                
                if ($state) {
                    DB::table('states')
                        ->where('id', $state->id)
                        ->update(['inegi_clave' => $estadoData['clave_entidad']]);
                        
                    foreach ($estadoData['municipios'] as $muni) {
                        $muniName = $muni['nombre'];
                        // Try direct match
                        $muniDb = DB::table('municipalities')
                            ->where('state_id', $state->id)
                            ->where('nombre', $muniName)
                            ->first();
                            
                        // Try without accents if direct match fails
                        if (!$muniDb) {
                            $muniDb = DB::table('municipalities')
                                ->where('state_id', $state->id)
                                ->where('nombre', 'LIKE', '%' . $this->removeAccents($muniName) . '%')
                                ->first();
                        }

                        if ($muniDb) {
                            DB::table('municipalities')
                                ->where('id', $muniDb->id)
                                ->update(['inegi_clave' => $muni['clave_municipio']]);
                        }
                    }
                }

                $this->command->getOutput()->progressAdvance();
            }

            DB::commit();
            $this->command->getOutput()->progressFinish();
            $this->command->info('¡Claves INEGI actualizadas correctamente!');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Ocurrió un error al actualizar: ' . $e->getMessage());
        }
    }
    
    private function mapStateName($name)
    {
        $map = [
            'Veracruz' => 'Veracruz de Ignacio de la Llave',
            'Coahuila' => 'Coahuila de Zaragoza',
            'Michoacan' => 'Michoacán de Ocampo',
            'Estado de Mexico' => 'México',
            'Distrito Federal' => 'Ciudad de México',
        ];
        
        return $map[$name] ?? $name;
    }

    private function removeAccents($string)
    {
        return strtr(utf8_decode($string), utf8_decode('àáâãäçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ'), 'aaaaaceeeeiiiinooooouuuuyyAAAAACEEEEIIIINOOOOOUUUUY');
    }
}
