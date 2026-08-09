<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Enums\UserRole;

class TerritoryAdminsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Iniciando creación de administradores territoriales...');

        $password = Hash::make('password123');
        $usersToInsert = [];

        // 1. Crear un Admin por Estado
        $states = DB::table('states')->get();
        $this->command->info("Creando administradores para {$states->count()} estados...");
        
        foreach ($states as $state) {
            $slug = Str::slug($state->nombre);
            $email = "admin.{$slug}@prueba.com";

            // Verificar si ya existe
            $exists = DB::table('users')->where('email', $email)->exists();
            if (!$exists) {
                $usersToInsert[] = [
                    'name' => "Admin Estatal - {$state->nombre}",
                    'email' => $email,
                    'password' => $password,
                    'role' => UserRole::ADMIN->value,
                    'scope_level' => 'estatal',
                    'state_id' => $state->id,
                    'municipality_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // 2. Crear un Admin por Municipio
        $municipalities = DB::table('municipalities')->get();
        $this->command->info("Creando administradores para {$municipalities->count()} municipios...");
        $this->command->getOutput()->progressStart($municipalities->count());

        foreach ($municipalities as $muni) {
            $muniSlug = Str::slug($muni->nombre);
            // Agregamos el ID para evitar choques de nombres de municipios iguales en distintos estados (ej. "Centro")
            $email = "admin.m{$muni->id}.{$muniSlug}@prueba.com";

            $exists = DB::table('users')->where('email', $email)->exists();
            if (!$exists) {
                $usersToInsert[] = [
                    'name' => "Admin Mpal - {$muni->nombre}",
                    'email' => $email,
                    'password' => $password,
                    'role' => UserRole::ADMIN->value,
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
            $this->command->info("Insertando " . count($usersToInsert) . " usuarios en la base de datos...");
            
            // Dividir en trozos (chunks) de 500 para no saturar memoria o límites de SQL
            $chunks = array_chunk($usersToInsert, 500);
            $this->command->getOutput()->progressStart(count($chunks));
            
            foreach ($chunks as $chunk) {
                DB::table('users')->insert($chunk);
                $this->command->getOutput()->progressAdvance();
            }
            $this->command->getOutput()->progressFinish();
        }

        $this->command->info('¡Administradores territoriales creados correctamente!');
        $this->command->info('Ejemplo de correo Estatal: admin.aguascalientes@prueba.com');
        $this->command->info('Ejemplo de correo Municipal: admin.m1.aguascalientes@prueba.com');
        $this->command->info('Contraseña para todos: password123');
    }
}
