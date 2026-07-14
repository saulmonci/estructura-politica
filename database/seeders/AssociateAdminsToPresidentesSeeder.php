<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AssociateAdminsToPresidentesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Asociando administradores territoriales a sus respectivos presidentes...');

        // 1. Asociar admins municipales a presidentes municipales
        $municipalAdmins = User::where('role', 'admin')->where('scope_level', 'municipal')->whereNotNull('municipality_id')->get();
        $this->command->info("Asociando {$municipalAdmins->count()} admins municipales...");
        $this->command->getOutput()->progressStart($municipalAdmins->count());

        foreach ($municipalAdmins as $admin) {
            $presidente = User::where('role', 'presidente')
                ->where('scope_level', 'municipal')
                ->where('municipality_id', $admin->municipality_id)
                ->first();

            if ($presidente) {
                $admin->parent_id = $presidente->id;
                $admin->presidente_id = $presidente->id;
                $admin->saveQuietly();
            }
            $this->command->getOutput()->progressAdvance();
        }
        $this->command->getOutput()->progressFinish();

        // 2. Asociar admins estatales a presidentes estatales
        $stateAdmins = User::where('role', 'admin')->where('scope_level', 'estatal')->whereNotNull('state_id')->get();
        $this->command->info("Asociando {$stateAdmins->count()} admins estatales...");
        $this->command->getOutput()->progressStart($stateAdmins->count());

        foreach ($stateAdmins as $admin) {
            $presidente = User::where('role', 'presidente')
                ->where('scope_level', 'estatal')
                ->where('state_id', $admin->state_id)
                ->first();

            if ($presidente) {
                $admin->parent_id = $presidente->id;
                $admin->presidente_id = $presidente->id;
                $admin->saveQuietly();
            }
            $this->command->getOutput()->progressAdvance();
        }
        $this->command->getOutput()->progressFinish();

        $this->command->info('¡Asociación completada correctamente!');
    }
}
