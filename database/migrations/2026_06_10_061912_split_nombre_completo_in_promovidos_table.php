<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            // Agregar las nuevas columnas después de 'id'
            $table->string('nombre', 100)->after('id')->default('');
            $table->string('apellidos', 100)->after('nombre')->default('');
        });

        // Migrar datos existentes: partir nombre_completo en nombre y apellidos
        // Primer token = nombre, el resto = apellidos
        DB::statement("
            UPDATE promovidos
            SET
                nombre   = TRIM(SUBSTRING_INDEX(nombre_completo, ' ', 1)),
                apellidos = TRIM(SUBSTRING(nombre_completo, LOCATE(' ', nombre_completo) + 1))
            WHERE nombre_completo IS NOT NULL AND nombre_completo != ''
        ");

        Schema::table('promovidos', function (Blueprint $table) {
            // Quitar el default temporal
            $table->string('nombre', 100)->nullable(false)->change();
            $table->string('apellidos', 100)->nullable(false)->change();
            // Eliminar la columna vieja
            $table->dropColumn('nombre_completo');
        });
    }

    public function down(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            $table->string('nombre_completo', 255)->after('id')->default('');
        });

        DB::statement("
            UPDATE promovidos
            SET nombre_completo = CONCAT(TRIM(nombre), ' ', TRIM(apellidos))
        ");

        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropColumn(['nombre', 'apellidos']);
        });
    }
};
