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
        Schema::create('promovidos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_completo');
            $table->string('clave_elector')->unique();
            $table->string('telefono')->nullable();
            $table->string('seccion_electoral');
            $table->string('colonia');
            $table->foreignId('promotor_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Optimización con índices para búsquedas rápidas
            $table->index('nombre_completo');
            $table->index('seccion_electoral');
            $table->index('colonia');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promovidos');
    }
};
