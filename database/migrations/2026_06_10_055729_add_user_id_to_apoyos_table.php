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
        Schema::table('apoyos', function (Blueprint $table) {
            // Hacer promovido_id nullable para que apoyos funcionen también para promotores
            $table->foreignId('promovido_id')->nullable()->change();
            // Nuevo: apoyos para usuarios (promotores)
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade')->after('promovido_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apoyos', function (Blueprint $table) {
            //
        });
    }
};
