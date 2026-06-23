<?php

namespace Database\Seeders;

use App\Models\Promovido;
use App\Models\Demarcacion;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PoblarMapaSemaforoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Obtener promotores existentes
        $promotores = User::where('role', 'promotor')->pluck('id')->toArray();
        if (empty($promotores)) {
            // Si no hay promotores, creamos uno por defecto para asociar los promovidos
            $promotorId = DB::table('users')->insertGetId([
                'name' => 'Promotor General',
                'email' => 'promotor.general@estructura.com',
                'password' => bcrypt('secret'),
                'role' => 'promotor',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $promotores = [$promotorId];
        }

        // 2. Limpiar la tabla de promovidos para tener números exactos
        DB::table('promovidos')->delete();

        // 3. Obtener demarcaciones y sus secciones electorales
        $demarcaciones = Demarcacion::with('secciones')->get();
        if ($demarcaciones->isEmpty()) {
            $this->command->error('No hay demarcaciones en la base de datos. Por favor corre el CatalogoSeeder primero.');
            return;
        }

        // Definir la cantidad de promovidos deseados por demarcación para pintar los 3 colores
        // Dem 1 (meta 400): 280 -> 70% (Verde)
        // Dem 2 (meta 1000): 120 -> 12% (Rojo)
        // Dem 3 (meta 800): 420 -> 52.5% (Amarillo)
        // Dem 4 (meta 600): 300 -> 50% (Amarillo)
        // Dem 5 (meta 700): 80 -> 11.4% (Rojo)
        // Dem 6 (meta 500): 360 -> 72% (Verde)
        // Dem 7 (meta 450): 40 -> 8.8% (Rojo)
        // Dem 8 (meta 900): 90 -> 10% (Rojo)
        // Dem 9 (meta 1200): 110 -> 9.1% (Rojo)
        $targets = [
            1 => 280, // Verde
            2 => 120, // Rojo
            3 => 420, // Amarillo
            4 => 300, // Amarillo
            5 => 80,  // Rojo
            6 => 360, // Verde
            7 => 40,  // Rojo
            8 => 90,  // Rojo
            9 => 110, // Rojo
        ];

        $this->command->info('Iniciando poblamiento masivo de promovidos para colorear el semáforo...');

        $chunk = [];
        $count = 0;

        $nombres = ['Juan', 'María', 'José', 'Ana', 'Carlos', 'Guadalupe', 'Luis', 'Sofía', 'Francisco', 'Laura', 'Pedro', 'Rosa', 'Miguel', 'Patricia', 'Jorge', 'Elena'];
        $apellidos = ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz', 'Gómez', 'Flores', 'Morales', 'Vázquez', 'Jiménez', 'Reyes'];
        $colonias = ['Centro', 'Lomas', 'Vista Hermosa', 'San Juan', 'Las Palmas', 'Pedregal', 'Santa Fe', 'Infonavit'];

        foreach ($demarcaciones as $demarcacion) {
            $demId = $demarcacion->id;
            $quantity = $targets[$demId] ?? 50;
            $secciones = $demarcacion->secciones->pluck('numero')->toArray();

            if (empty($secciones)) {
                $secciones = ['0001'];
            }

            for ($i = 0; $i < $quantity; $i++) {
                $nombre = $nombres[array_rand($nombres)];
                $apellidoPaterno = $apellidos[array_rand($apellidos)];
                $apellidoMaterno = $apellidos[array_rand($apellidos)];
                
                // Clave elector simulada (18 caracteres) única
                $claveElector = strtoupper(Str::random(6)) . rand(10, 99) . rand(10, 99) . rand(10, 99) . rand(10, 99) . strtoupper(Str::random(4)) . rand(1, 9) . $count;
                
                $chunk[] = [
                    'nombre' => $nombre,
                    'apellidos' => "$apellidoPaterno $apellidoMaterno",
                    'clave_elector' => substr($claveElector, 0, 18), // forzar 18 caracteres max
                    'telefono' => '322' . rand(1000000, 9999999),
                    'seccion_electoral' => $secciones[array_rand($secciones)],
                    'colonia' => $colonias[array_rand($colonias)],
                    'promotor_id' => $promotores[array_rand($promotores)],
                    'demarcacion_id' => $demId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $count++;

                // Insertar en bloques de 200 para optimizar el rendimiento y memoria
                if (count($chunk) >= 200) {
                    DB::table('promovidos')->insert($chunk);
                    $chunk = [];
                }
            }
        }

        // Insertar el remanente
        if (count($chunk) > 0) {
            DB::table('promovidos')->insert($chunk);
        }

        $this->command->info("Se crearon exitosamente {$count} promovidos distribuidos por demarcación:");
        $this->command->info(" - Verde (Alta densidad): Demarcación 1 ({$targets[1]}) y Demarcación 6 ({$targets[6]})");
        $this->command->info(" - Amarillo (Media densidad): Demarcación 3 ({$targets[3]}) y Demarcación 4 ({$targets[4]})");
        $this->command->info(" - Rojo (Baja densidad): Demarcaciones 2, 5, 7, 8, 9");
    }
}
