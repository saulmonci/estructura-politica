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
        // 1. Añadir SCOPES (state_id, municipality_id) a las tablas faltantes
        
        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->foreignId('state_id')->nullable()->after('municipality_id')->constrained('states')->onDelete('set null');
        });

        Schema::table('secciones_electorales', function (Blueprint $table) {
            $table->foreignId('state_id')->nullable()->after('demarcacion_id')->constrained('states')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->after('state_id')->constrained('municipalities')->onDelete('set null');
            $table->index(['state_id', 'municipality_id']);
        });

        Schema::table('apoyos', function (Blueprint $table) {
            $table->foreignId('state_id')->nullable()->after('promovido_id')->constrained('states')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->after('state_id')->constrained('municipalities')->onDelete('set null');
            $table->index(['state_id', 'municipality_id']);
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('state_id')->nullable()->after('user_id')->constrained('states')->onDelete('set null');
            $table->foreignId('municipality_id')->nullable()->after('state_id')->constrained('municipalities')->onDelete('set null');
            $table->index(['state_id', 'municipality_id']);
        });

        // 2. BACKFILL: Llenar los datos históricos y corregir el "Estado/Municipio por Defecto"
        
        $defaultState = DB::table('states')->where('nombre', 'Estado por Defecto')->first();
        $defaultMuni = DB::table('municipalities')->where('nombre', 'Municipio por Defecto')->first();
        
        $nayarit = DB::table('states')->where('nombre', 'Nayarit')->first();
        $bahia = null;
        if ($nayarit) {
            $bahia = DB::table('municipalities')->where('state_id', $nayarit->id)->where('nombre', 'Bahía de Banderas')->first();
        }

        if ($defaultState && $defaultMuni && $nayarit && $bahia) {
            $oldStateId = $defaultState->id;
            $oldMuniId = $defaultMuni->id;
            $newStateId = $nayarit->id;
            $newMuniId = $bahia->id;

            // Trasladar todos los registros que se quedaron en el "Defecto" hacia Bahía de Banderas, Nayarit
            DB::table('demarcaciones')->where('municipality_id', $oldMuniId)->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            DB::table('secciones_electorales')->where('municipality_id', $oldMuniId)->orWhereNull('municipality_id')->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            DB::table('promovidos')->where('municipality_id', $oldMuniId)->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            DB::table('users')->where('municipality_id', $oldMuniId)->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            DB::table('apoyos')->where('municipality_id', $oldMuniId)->orWhereNull('municipality_id')->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            DB::table('activity_logs')->where('municipality_id', $oldMuniId)->orWhereNull('municipality_id')->update(['municipality_id' => $newMuniId, 'state_id' => $newStateId]);
            
            // Delete the default ones if they are no longer used
            DB::table('municipalities')->where('id', $oldMuniId)->delete();
            DB::table('states')->where('id', $oldStateId)->delete();
        } else {
            // Fallback: Si no existen, solo hacer el join SQL estándar
            if (DB::getDriverName() === 'pgsql') {
                DB::statement('UPDATE demarcaciones SET state_id = m.state_id FROM municipalities m WHERE demarcaciones.municipality_id = m.id');
                DB::statement('UPDATE secciones_electorales SET municipality_id = d.municipality_id, state_id = d.state_id FROM demarcaciones d WHERE secciones_electorales.demarcacion_id = d.id');
                DB::statement('UPDATE apoyos SET municipality_id = p.municipality_id, state_id = p.state_id FROM promovidos p WHERE apoyos.promovido_id = p.id');
                DB::statement('UPDATE activity_logs SET municipality_id = u.municipality_id, state_id = u.state_id FROM users u WHERE activity_logs.user_id = u.id');
            } else {
                // Fallback for MySQL/SQLite
                $demarcaciones = DB::table('demarcaciones')->join('municipalities', 'demarcaciones.municipality_id', '=', 'municipalities.id')->select('demarcaciones.id', 'municipalities.state_id')->get();
                foreach ($demarcaciones as $d) {
                    DB::table('demarcaciones')->where('id', $d->id)->update(['state_id' => $d->state_id]);
                }
                
                $secciones = DB::table('secciones_electorales')->join('demarcaciones', 'secciones_electorales.demarcacion_id', '=', 'demarcaciones.id')->select('secciones_electorales.id', 'demarcaciones.state_id', 'demarcaciones.municipality_id')->get();
                foreach ($secciones as $s) {
                    DB::table('secciones_electorales')->where('id', $s->id)->update(['state_id' => $s->state_id, 'municipality_id' => $s->municipality_id]);
                }

                $apoyos = DB::table('apoyos')->join('promovidos', 'apoyos.promovido_id', '=', 'promovidos.id')->select('apoyos.id', 'promovidos.state_id', 'promovidos.municipality_id')->get();
                foreach ($apoyos as $a) {
                    DB::table('apoyos')->where('id', $a->id)->update(['state_id' => $a->state_id, 'municipality_id' => $a->municipality_id]);
                }

                $logs = DB::table('activity_logs')->join('users', 'activity_logs.user_id', '=', 'users.id')->select('activity_logs.id', 'users.state_id', 'users.municipality_id')->get();
                foreach ($logs as $l) {
                    DB::table('activity_logs')->where('id', $l->id)->update(['state_id' => $l->state_id, 'municipality_id' => $l->municipality_id]);
                }
            }
        }

        // 3. Añadir SOFT DELETES a todas las tablas base
        $tables = [
            'users', 'promovidos', 'demarcaciones', 'secciones_electorales', 
            'apoyos', 'activity_logs', 'states', 'municipalities'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revertir Soft Deletes
        $tables = [
            'users', 'promovidos', 'demarcaciones', 'secciones_electorales', 
            'apoyos', 'activity_logs', 'states', 'municipalities'
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    if (Schema::hasColumn($table->getTable(), 'deleted_at')) {
                        $table->dropSoftDeletes();
                    }
                });
            }
        }

        // Revertir Scopes
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropForeign(['municipality_id']);
            $table->dropColumn(['state_id', 'municipality_id']);
        });

        Schema::table('apoyos', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropForeign(['municipality_id']);
            $table->dropColumn(['state_id', 'municipality_id']);
        });

        Schema::table('secciones_electorales', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropForeign(['municipality_id']);
            $table->dropColumn(['state_id', 'municipality_id']);
        });

        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->dropForeign(['state_id']);
            $table->dropColumn('state_id');
        });
    }
};
