<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabla pivote para metas de Demarcaciones por Presidente
        Schema::create('demarcacion_presidente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presidente_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('demarcacion_id')->constrained('demarcaciones')->onDelete('cascade');
            $table->integer('meta')->default(0);
            $table->timestamps();

            $table->unique(['presidente_id', 'demarcacion_id']);
        });

        // 2. Tabla pivote para metas de Secciones Electorales por Presidente
        Schema::create('seccion_electoral_presidente', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presidente_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('seccion_electoral_id')->constrained('secciones_electorales')->onDelete('cascade');
            $table->integer('meta')->default(0);
            $table->timestamps();

            $table->unique(['presidente_id', 'seccion_electoral_id']);
        });

        // 3. Backfill de datos existentes para Presidentes actuales
        $presidentes = DB::table('users')->where('role', 'presidente')->get();
        $now = now();

        foreach ($presidentes as $presidente) {
            // A) Demarcaciones correspondientes al municipio del presidente
            $demarcacionesQuery = DB::table('demarcaciones')->whereNull('deleted_at');
            if ($presidente->municipality_id) {
                $demarcacionesQuery->where('municipality_id', $presidente->municipality_id);
            }
            $demarcaciones = $demarcacionesQuery->get();

            $demarcacionesInsert = [];
            foreach ($demarcaciones as $d) {
                $demarcacionesInsert[] = [
                    'presidente_id' => $presidente->id,
                    'demarcacion_id' => $d->id,
                    'meta' => $d->meta ?? 500,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            if (!empty($demarcacionesInsert)) {
                DB::table('demarcacion_presidente')->insertOrIgnore($demarcacionesInsert);
            }

            // B) Secciones correspondientes al municipio del presidente
            $seccionesQuery = DB::table('secciones_electorales')->whereNull('deleted_at');
            if ($presidente->municipality_id) {
                $seccionesQuery->where('municipality_id', $presidente->municipality_id);
            }
            $secciones = $seccionesQuery->get();

            $seccionesInsert = [];
            foreach ($secciones as $s) {
                $seccionesInsert[] = [
                    'presidente_id' => $presidente->id,
                    'seccion_electoral_id' => $s->id,
                    'meta' => $s->meta ?? 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            if (!empty($seccionesInsert)) {
                foreach (array_chunk($seccionesInsert, 500) as $chunk) {
                    DB::table('seccion_electoral_presidente')->insertOrIgnore($chunk);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seccion_electoral_presidente');
        Schema::dropIfExists('demarcacion_presidente');
    }
};
