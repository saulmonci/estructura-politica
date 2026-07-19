<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Demarcacion;
use App\Models\SeccionElectoral;

class UpdatePromotorTest extends Command
{
    protected $signature = 'promotor:update-test';
    protected $description = 'Update test promotor with demarcacion and seccion';

    public function handle()
    {
        $promotor = User::where('email', 'promotor.bahia@test.com')->first();
        if (!$promotor) {
            $this->error("Promotor no encontrado.");
            return;
        }

        $demarcacion = Demarcacion::where('municipality_id', $promotor->municipality_id)->first();
        $seccion = SeccionElectoral::where('municipality_id', $promotor->municipality_id)->first();

        if (!$demarcacion) {
            $this->info("Creando Demarcacion 1...");
            $demarcacion = Demarcacion::create([
                'nombre' => 'Demarcación 1',
                'municipality_id' => $promotor->municipality_id,
                'state_id' => $promotor->state_id
            ]);
        }

        if (!$seccion) {
            $this->info("Creando Seccion Electoral 001...");
            $seccion = SeccionElectoral::create([
                'numero' => '001',
                'demarcacion_id' => $demarcacion->id
            ]);
        }

        $promotor->demarcacion_id = $demarcacion->id;
        $promotor->seccion_electoral = $seccion->numero;
        $promotor->save();

        $this->info("Promotor actualizado!");
        $this->info("Demarcacion: " . $demarcacion->nombre . " (ID: " . $demarcacion->id . ")");
        $this->info("Seccion: " . $seccion->numero);
    }
}
