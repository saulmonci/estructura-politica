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

        // Migrar datos existentes usando PHP para compatibilidad con MySQL y PostgreSQL
        DB::table('promovidos')
            ->whereNotNull('nombre_completo')
            ->where('nombre_completo', '!=', '')
            ->get(['id', 'nombre_completo'])
            ->each(function ($row) {
                $parts = explode(' ', trim($row->nombre_completo), 2);
                DB::table('promovidos')->where('id', $row->id)->update([
                    'nombre'    => $parts[0] ?? '',
                    'apellidos' => $parts[1] ?? '',
                ]);
            });

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
