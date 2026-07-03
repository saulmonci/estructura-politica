<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 0. Cambiar rol de enum a string para permitir nuevos roles
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->change();
        });
        // Postgres no elimina la restricción CHECK de un enum automáticamente al pasarlo a string.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }

        // 1. Modificar tabla de Usuarios
        Schema::table('users', function (Blueprint $table) {
            $table->string('scope_level')->default('demarcacion')->after('role'); // estatal, municipal, demarcacion
            $table->string('candidate_type')->nullable()->after('scope_level'); // gobernador, presidente_municipal, regidor
            $table->foreignId('state_id')->nullable()->after('candidate_type')->constrained('states')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->after('state_id')->constrained('municipalities')->onDelete('set null');
            
            $table->index(['scope_level', 'candidate_type', 'state_id', 'municipality_id']);
        });

        // 2. Modificar tabla de Promovidos
        Schema::table('promovidos', function (Blueprint $table) {
            $table->foreignId('state_id')->nullable()->after('demarcacion_id')->constrained('states')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->after('state_id')->constrained('municipalities')->onDelete('set null');
            
            $table->index(['state_id', 'municipality_id']);
        });

        // 3. Realizar Backfill de Datos Existentes
        $defaultMuni = DB::table('municipalities')->first();
        if ($defaultMuni) {
            $defaultMuniId = $defaultMuni->id;
            $defaultStateId = $defaultMuni->state_id;

            // A) Actualizar promovidos masivamente (Bulk Updates) para evitar problemas de memoria
            // Primero asentar valores por defecto para todos
            DB::table('promovidos')->update([
                'municipality_id' => $defaultMuniId,
                'state_id' => $defaultStateId
            ]);

            // Luego actualizar aquellos cuya demarcación pertenezca a un municipio específico
            $demarcaciones = DB::table('demarcaciones')->get();
            foreach ($demarcaciones as $demarcacion) {
                DB::table('promovidos')->where('demarcacion_id', $demarcacion->id)->update([
                    'municipality_id' => $demarcacion->municipality_id,
                ]);
            }

            // B) Actualizar usuarios masivamente (Bulk Updates)
            // Administradores y Superusuarios
            DB::table('users')->whereIn('role', ['admin', 'superuser'])->update([
                'scope_level' => 'estatal',
                'candidate_type' => 'gobernador',
                'state_id' => $defaultStateId,
                'municipality_id' => null,
                'demarcacion_id' => null
            ]);

            // Presidentes Municipales
            DB::table('users')->where('role', 'presidente')->update([
                'scope_level' => 'municipal',
                'candidate_type' => 'presidente_municipal',
                'state_id' => $defaultStateId,
                'municipality_id' => $defaultMuniId,
                'demarcacion_id' => null
            ]);

            // Demás usuarios (por defecto Regidores/Demarcación)
            DB::table('users')->whereNotIn('role', ['admin', 'superuser', 'presidente'])->update([
                'scope_level' => 'demarcacion',
                'candidate_type' => 'regidor',
                'state_id' => $defaultStateId,
                'municipality_id' => $defaultMuniId
            ]);

            // Ajustar municipio a los demás usuarios si tienen demarcación
            foreach ($demarcaciones as $demarcacion) {
                DB::table('users')
                    ->whereNotIn('role', ['admin', 'superuser', 'presidente'])
                    ->where('demarcacion_id', $demarcacion->id)
                    ->update([
                        'municipality_id' => $demarcacion->municipality_id,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropForeign(['municipality_id']);
            $table->dropColumn(['state_id', 'municipality_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropForeign(['municipality_id']);
            $table->dropColumn(['scope_level', 'candidate_type', 'state_id', 'municipality_id']);
        });
    }
};
