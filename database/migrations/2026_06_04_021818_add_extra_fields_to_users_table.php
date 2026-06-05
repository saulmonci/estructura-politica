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
        Schema::table('users', function (Blueprint $table) {
            $table->string('sexo')->nullable();
            $table->string('calle')->nullable();
            $table->string('numero_exterior')->nullable();
            $table->string('numero_interior')->nullable();
            $table->string('colonia')->nullable();
            $table->string('demarcacion')->nullable();
            $table->string('clave_electoral')->nullable();
            $table->string('telefono')->nullable();
            $table->string('curp')->nullable();
            $table->string('apodo')->nullable();
            $table->string('foto')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'sexo',
                'calle',
                'numero_exterior',
                'numero_interior',
                'colonia',
                'demarcacion',
                'clave_electoral',
                'telefono',
                'curp',
                'apodo',
                'foto'
            ]);
        });
    }
};
