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
                // Try direct match
                $state = DB::table('states')->where('nombre', $estadoNombre)->first();
                
                // If not matched, try removing accents or known mappings
                if (!$state) {
                    $mappedName = $this->mapStateName($estadoNombre);
                    $state = DB::table('states')->where('nombre', $mappedName)->first();
                }
                
                if (!$state) {
                    // Try mapping based on stripped accents
                    $state = DB::table('states')->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nombre, 'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u') LIKE ?", ['%'.$this->removeAccents($estadoNombre).'%'])->first();
                }
                
                if ($state) {
                    DB::table('states')
                        ->where('id', $state->id)
                        ->update(['inegi_clave' => $estadoData['clave_entidad']]);
                        
                    foreach ($estadoData['municipios'] as $muni) {
                        $muniName = $muni['nombre'];
                        
                        // Check explicit municipality mapping first (e.g. Playa del Carmen -> Solidaridad)
                        $muniDbName = $this->mapMunicipalityName($muniName, $estadoNombre);
                        
                        // Try direct match
                        $muniDb = DB::table('municipalities')
                            ->where('state_id', $state->id)
                            ->where('nombre', $muniDbName)
                            ->first();
                            
                        // Try without accents if direct match fails
                        if (!$muniDb) {
                            $muniDb = DB::table('municipalities')
                                ->where('state_id', $state->id)
                                ->where('nombre', 'LIKE', '%' . $this->removeAccents($muniDbName) . '%')
                                ->first();
                        }

                        if ($muniDb) {
                            DB::table('municipalities')
                                ->where('id', $muniDb->id)
                                ->update(['inegi_clave' => $muni['clave_municipio']]);
                        }
                    }
                    
                    // Assign keys to new municipalities missing in the old catalog
                    $this->assignRecentMunicipalities($state->id, $estadoData['clave_entidad']);
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

    private function mapMunicipalityName($inegiName, $estadoNombre)
    {
        $map = [
            'Quintana Roo' => [
                'Solidaridad' => 'Playa del Carmen',
            ],
            'Veracruz' => [
                'Medellin' => 'Medellín de Bravo',
            ],
            'Guanajuato' => [
                'San Jose Iturbide' => 'San José de Iturbide'
            ],
            'Oaxaca' => [
                'Miahuatlan de Porfirio Diaz' => 'Heroica Ciudad de Miahuatlán de Porfirio Díaz',
                'Tezoatlan de Segura y Luna' => 'Heroica Villa Tezoatlán de Segura y Luna, Cuna de la Independencia de Oaxaca',
                'San Martin de los Cansecos' => 'Heroico San Martín de los Cansecos',
                'Matias Romero Avendaño' => 'Matías Romero Avendaño',
                'San Andres Nuxiño' => 'San Andrés Nuxiño',
                'San Bartolome Yucuañe' => 'San Bartolomé Yucuañe',
                'San Jose del Peñasco' => 'San José del Peñasco',
                'Santa Maria Peñoles' => 'Santa María Peñoles'
            ],
            'Nayarit' => [
                'Amatlan de Cañas' => 'Amatlán de Cañas'
            ],
            'Jalisco' => [
                'Tlajomulco de Zuñiga' => 'Tlajomulco de Zúñiga'
            ]
        ];
        
        return $map[$estadoNombre][$inegiName] ?? $inegiName;
    }

    private function assignRecentMunicipalities($stateId, $claveEntidad)
    {
        // Nuevos municipios que no están en catálogos antiguos
        $recents = [
            '02' => [ // Baja California
                'San Quintín' => '006',
                'San Felipe' => '007',
            ],
            '04' => [ // Campeche
                'Dzitbalché' => '012',
                'Seybaplaya' => '013',
            ],
            '07' => [ // Chiapas
                'El Parral' => '121',
                'Emiliano Zapata' => '122',
                'Mezcalapa' => '123',
                'Honduras de la Sierra' => '124',
                'Capitán Luis Ángel Vidal' => '125',
            ],
            '12' => [ // Guerrero
                'Ñuu Savi' => '082',
                'Las Vigas' => '083',
                'San Nicolás' => '084',
                'Santa Cruz del Rincón' => '085',
            ],
            '17' => [ // Morelos
                'Coatetelco' => '034',
                'Hueyapan' => '035',
                'Xoxocotla' => '036',
            ],
            '23' => [ // Quintana Roo
                'Puerto Morelos' => '011',
            ],
            '25' => [ // Sinaloa
                'Eldorado' => '019',
                'Juan José Ríos' => '020',
            ]
        ];

        if (isset($recents[$claveEntidad])) {
            foreach ($recents[$claveEntidad] as $nombre => $clave_municipio) {
                DB::table('municipalities')
                    ->where('state_id', $stateId)
                    ->where('nombre', $nombre)
                    ->update(['inegi_clave' => $clave_municipio]);
            }
        }
    }

    private function removeAccents($string)
    {
        return strtr(utf8_decode($string), utf8_decode('àáâãäçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ'), 'aaaaaceeeeiiiinooooouuuuyyAAAAACEEEEIIIINOOOOOUUUUY');
    }
}
