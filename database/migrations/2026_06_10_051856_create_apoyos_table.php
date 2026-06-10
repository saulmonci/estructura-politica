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
        Schema::create('apoyos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promovido_id')->constrained('promovidos')->onDelete('cascade');
            $table->date('fecha');
            $table->string('tipo_apoyo');
            $table->text('descripcion')->nullable();
            $table->string('estado')->default('Entregado'); // Entregado, Pendiente, Cancelado, etc.
            $table->string('evidencia')->nullable(); // Path to photo/file
            $table->decimal('cantidad_monetaria', 10, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('apoyos');
    }
};
