<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Enums\UserRole;

class TerritoryPresidentesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Iniciando creación de presidentes territoriales...');

        $password = Hash::make('password123');
        $usersToInsert = [];

        // 1. Crear un Presidente por Estado
        $states = DB::table('states')->get();
        $this->command->info("Creando presidentes para {$states->count()} estados...");
        
        foreach ($states as $state) {
            $slug = Str::slug($state->nombre);
            $email = "presidente.{$slug}@prueba.com";

            // Verificar si ya existe
            $exists = DB::table('users')->where('email', $email)->exists();
            if (!$exists) {
                $usersToInsert[] = [
                    'name' => "Presidente Estatal - {$state->nombre}",
                    'email' => $email,
                    'password' => $password,
                    'role' => UserRole::PRESIDENTE->value,
                    'scope_level' => 'estatal',
                    'state_id' => $state->id,
                    'municipality_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // 2. Crear un Presidente por Municipio
        $municipalities = DB::table('municipalities')->get();
        $this->command->info("Creando presidentes para {$municipalities->count()} municipios...");
        $this->command->getOutput()->progressStart($municipalities->count());

        foreach ($municipalities as $muni) {
            $muniSlug = Str::slug($muni->nombre);
            // Agregamos el ID para evitar choques
            $email = "presidente.m{$muni->id}.{$muniSlug}@prueba.com";

            $exists = DB::table('users')->where('email', $email)->exists();
            if (!$exists) {
                $usersToInsert[] = [
                    'name' => "Presidente Mpal - {$muni->nombre}",
                    'email' => $email,
                    'password' => $password,
                    'role' => UserRole::PRESIDENTE->value,
                    'scope_level' => 'municipal',
                    'state_id' => $muni->state_id,
                    'municipality_id' => $muni->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            $this->command->getOutput()->progressAdvance();
        }

        $this->command->getOutput()->progressFinish();

        // 3. Insertar todos los usuarios en bloque
        if (!empty($usersToInsert)) {
            $this->command->info("Insertando " . count($usersToInsert) . " presidentes territoriales en la base de datos...");
            
            $chunks = array_chunk($usersToInsert, 500);
            $this->command->getOutput()->progressStart(count($chunks));
            
            foreach ($chunks as $chunk) {
                DB::table('users')->insert($chunk);
                $this->command->getOutput()->progressAdvance();
            }
            $this->command->getOutput()->progressFinish();

            // 4. Update presidente_id to themselves for all newly created presidentes
            DB::statement("UPDATE users SET presidente_id = id WHERE role = '" . UserRole::PRESIDENTE->value . "' AND presidente_id IS NULL");
        }

        $this->command->info('¡Presidentes territoriales creados correctamente!');
        $this->command->info('Ejemplo de correo Estatal: presidente.aguascalientes@prueba.com');
        $this->command->info('Ejemplo de correo Municipal: presidente.m1.aguascalientes@prueba.com');
        $this->command->info('Contraseña para todos: password123');
    }
}

