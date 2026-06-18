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
        Schema::table('promovidos', function (Blueprint $table) {
            $table->string('calle')->nullable()->after('colonia');
            $table->string('numero')->nullable()->after('calle');
            $table->string('codigo_postal')->nullable()->after('numero');
            $table->string('curp')->nullable()->after('clave_elector');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropColumn(['calle', 'numero', 'codigo_postal', 'curp']);
        });
    }
};
