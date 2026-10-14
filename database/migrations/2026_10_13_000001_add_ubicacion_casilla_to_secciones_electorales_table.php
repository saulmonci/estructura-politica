<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('secciones_electorales', function (Blueprint $table) {
            if (! Schema::hasColumn('secciones_electorales', 'ubicacion_casilla')) {
                $table->string('ubicacion_casilla', 500)->nullable()->after('numero');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('secciones_electorales', function (Blueprint $table) {
            if (Schema::hasColumn('secciones_electorales', 'ubicacion_casilla')) {
                $table->dropColumn('ubicacion_casilla');
            }
        });
    }
};
