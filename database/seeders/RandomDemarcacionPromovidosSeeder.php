<?php

namespace Database\Seeders;

use App\Models\Promovido;
use App\Models\Demarcacion;
use Illuminate\Database\Seeder;

class RandomDemarcacionPromovidosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener todas las demarcaciones con sus secciones
        $demarcaciones = Demarcacion::with('secciones')->get();

        if ($demarcaciones->isEmpty()) {
            $this->command->error('No hay demarcaciones en la base de datos. Por favor corre el CatalogoSeeder primero.');
            return;
        }

        // Obtener todos los promovidos
        $promovidos = Promovido::all();

        if ($promovidos->isEmpty()) {
            $this->command->info('No hay promovidos para actualizar.');
            return;
        }

        $this->command->info("Asignando demarcaciones y secciones aleatorias a {$promovidos->count()} promovidos...");

        foreach ($promovidos as $promovido) {
            // Seleccionar una demarcación aleatoria
            $demarcacion = $demarcaciones->random();

            // Seleccionar una sección electoral aleatoria de esa demarcación si las tiene
            if ($demarcacion->secciones->isNotEmpty()) {
                $seccion = $demarcacion->secciones->random();
                $promovido->update([
                    'demarcacion_id' => $demarcacion->id,
                    'seccion_electoral' => $seccion->numero,
                ]);
            } else {
                $promovido->update([
                    'demarcacion_id' => $demarcacion->id,
                ]);
            }
        }

        $this->command->info('Asignación completada con éxito.');
    }
}
