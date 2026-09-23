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
            $table->boolean('ha_votado')->default(false)->index();
            $table->timestamp('voto_at')->nullable();
            $table->foreignId('marcado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['presidente_id', 'ha_votado']);
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->boolean('ha_votado')->default(false)->index();
            $table->timestamp('voto_at')->nullable();
            $table->foreignId('marcado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['presidente_id', 'ha_votado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropForeign(['marcado_por_id']);
            $table->dropIndex(['presidente_id', 'ha_votado']);
            $table->dropColumn(['ha_votado', 'voto_at', 'marcado_por_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['marcado_por_id']);
            $table->dropIndex(['presidente_id', 'ha_votado']);
            $table->dropColumn(['ha_votado', 'voto_at', 'marcado_por_id']);
        });
    }
};
