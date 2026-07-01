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

            // A) Actualizar promovidos existentes basándose en su demarcacion_id
            $promovidos = DB::table('promovidos')->get();
            foreach ($promovidos as $promovido) {
                if ($promovido->demarcacion_id) {
                    $demarcacion = DB::table('demarcaciones')->where('id', $promovido->demarcacion_id)->first();
                    if ($demarcacion) {
                        DB::table('promovidos')->where('id', $promovido->id)->update([
                            'municipality_id' => $demarcacion->municipality_id,
                            'state_id' => $defaultStateId
                        ]);
                        continue;
                    }
                }
                
                DB::table('promovidos')->where('id', $promovido->id)->update([
                    'municipality_id' => $defaultMuniId,
                    'state_id' => $defaultStateId
                ]);
            }

            // B) Actualizar usuarios existentes
            $users = DB::table('users')->get();
            foreach ($users as $user) {
                if ($user->role === 'admin' || $user->role === 'superuser') {
                    DB::table('users')->where('id', $user->id)->update([
                        'scope_level' => 'estatal',
                        'candidate_type' => 'gobernador',
                        'state_id' => $defaultStateId,
                        'municipality_id' => null,
                        'demarcacion_id' => null
                    ]);
                } 
                elseif ($user->role === 'presidente') {
                    DB::table('users')->where('id', $user->id)->update([
                        'scope_level' => 'municipal',
                        'candidate_type' => 'presidente_municipal',
                        'state_id' => $defaultStateId,
                        'municipality_id' => $defaultMuniId,
                        'demarcacion_id' => null
                    ]);
                } 
                else {
                    $muniId = $defaultMuniId;
                    if ($user->demarcacion_id) {
                        $demarcacion = DB::table('demarcaciones')->where('id', $user->demarcacion_id)->first();
                        if ($demarcacion) {
                            $muniId = $demarcacion->municipality_id;
                        }
                    }
                    DB::table('users')->where('id', $user->id)->update([
                        'scope_level' => 'demarcacion',
                        'candidate_type' => 'regidor',
                        'state_id' => $defaultStateId,
                        'municipality_id' => $muniId
                    ]);
                }
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
