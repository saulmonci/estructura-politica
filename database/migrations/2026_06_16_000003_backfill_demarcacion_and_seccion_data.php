<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Obtain all sections mapping from the catalog
        if (Schema::hasTable('secciones_electorales')) {
            $secciones = DB::table('secciones_electorales')->get();
            
            foreach ($secciones as $seccion) {
                // Backfill for Promovidos: set demarcacion based on their seccion_electoral
                DB::table('promovidos')
                    ->where('seccion_electoral', $seccion->numero)
                    ->where(function ($query) {
                        $query->whereNull('demarcacion')
                              ->orWhere('demarcacion', '');
                    })
                    ->update(['demarcacion' => (string)$seccion->demarcacion_id]);

                // Backfill for Users: set demarcacion based on their seccion_electoral
                DB::table('users')
                    ->where('seccion_electoral', $seccion->numero)
                    ->where(function ($query) {
                        $query->whereNull('demarcacion')
                              ->orWhere('demarcacion', '');
                    })
                    ->update(['demarcacion' => (string)$seccion->demarcacion_id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down operation needed for backfilled data
    }
};
