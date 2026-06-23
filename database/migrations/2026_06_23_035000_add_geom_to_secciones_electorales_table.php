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
        // Asegurar que PostGIS esté activo en PostgreSQL (producción) y agregar columna
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis;');
            DB::statement("SELECT AddGeometryColumn('public', 'secciones_electorales', 'geom', 32613, 'MULTIPOLYGON', 2);");
        } else {
            Schema::table('secciones_electorales', function (Blueprint $table) {
                $table->geometry('geom')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT DropGeometryColumn('public', 'secciones_electorales', 'geom');");
        } else {
            Schema::table('secciones_electorales', function (Blueprint $table) {
                $table->dropColumn('geom');
            });
        }
    }
};
