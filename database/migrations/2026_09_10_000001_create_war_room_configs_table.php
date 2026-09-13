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
        Schema::create('war_room_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presidente_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('whatsapp_group_id')->nullable()->index(); // ID del grupo WhatsApp ej: 120363xxx@g.us
            $table->string('whatsapp_phone')->nullable()->index();    // Teléfono directo si recibe por mensaje privado
            $table->boolean('reporte_matutino_enabled')->default(true);
            $table->boolean('alertas_inactividad_enabled')->default(true);
            $table->boolean('alertas_meta_enabled')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('war_room_configs');
    }
};
