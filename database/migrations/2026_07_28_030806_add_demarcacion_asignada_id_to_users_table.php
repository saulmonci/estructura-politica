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
            $table->unsignedBigInteger('demarcacion_asignada_id')->nullable()->after('demarcacion_id');
            $table->foreign('demarcacion_asignada_id')->references('id')->on('demarcaciones')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['demarcacion_asignada_id']);
            $table->dropColumn('demarcacion_asignada_id');
        });
    }
};
