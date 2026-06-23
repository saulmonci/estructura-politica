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
        // 1. Rename total_votantes to meta in demarcaciones table
        if (Schema::hasTable('demarcaciones') && Schema::hasColumn('demarcaciones', 'total_votantes')) {
            Schema::table('demarcaciones', function (Blueprint $table) {
                $table->renameColumn('total_votantes', 'meta');
            });
        } elseif (Schema::hasTable('demarcaciones') && !Schema::hasColumn('demarcaciones', 'meta')) {
            Schema::table('demarcaciones', function (Blueprint $table) {
                $table->integer('meta')->default(500)->after('nombre');
            });
        }

        // 2. Add meta to secciones_electorales table
        if (Schema::hasTable('secciones_electorales') && !Schema::hasColumn('secciones_electorales', 'meta')) {
            Schema::table('secciones_electorales', function (Blueprint $table) {
                $table->integer('meta')->default(0)->nullable()->after('demarcacion_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Rename meta back to total_votantes in demarcaciones table
        if (Schema::hasTable('demarcaciones') && Schema::hasColumn('demarcaciones', 'meta')) {
            Schema::table('demarcaciones', function (Blueprint $table) {
                $table->renameColumn('meta', 'total_votantes');
            });
        }

        // 2. Drop meta from secciones_electorales table
        if (Schema::hasTable('secciones_electorales') && Schema::hasColumn('secciones_electorales', 'meta')) {
            Schema::table('secciones_electorales', function (Blueprint $table) {
                $table->dropColumn('meta');
            });
        }
    }
};
