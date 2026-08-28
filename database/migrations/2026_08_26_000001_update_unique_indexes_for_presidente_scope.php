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
            $table->dropUnique('promovidos_clave_elector_unique');
            $table->dropUnique('promovidos_curp_unique');
            $table->string('clave_elector')->nullable()->change();
            $table->string('seccion_electoral')->nullable()->change();
            $table->string('colonia')->nullable()->change();
            $table->index(['presidente_id', 'clave_elector']);
            $table->index(['presidente_id', 'curp']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['presidente_id', 'clave_electoral']);
            $table->index(['presidente_id', 'curp']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['presidente_id', 'clave_electoral']);
            $table->dropIndex(['presidente_id', 'curp']);
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropIndex(['presidente_id', 'clave_elector']);
            $table->dropIndex(['presidente_id', 'curp']);
            $table->unique('clave_elector');
            $table->unique('curp');
        });
    }
};
