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
        // Asegurar que PostGIS esté activo en PostgreSQL (producción)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS postgis;');
        }

        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->geometry('geom')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->dropColumn('geom');
        });
    }
};
