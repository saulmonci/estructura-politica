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
        Schema::create('demarcaciones', function (Blueprint $table) {
            $table->id(); // this will store numbers 1 to 9
            $table->string('nombre');
            $table->timestamps();
        });

        Schema::create('secciones_electorales', function (Blueprint $table) {
            $table->id();
            $table->string('numero'); // e.g. "91", "92", "973"
            $table->foreignId('demarcacion_id')->constrained('demarcaciones')->onDelete('cascade');
            $table->timestamps();

            $table->index('numero');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('secciones_electorales');
        Schema::dropIfExists('demarcaciones');
    }
};
