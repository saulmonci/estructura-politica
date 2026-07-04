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
        Schema::table('states', function (Blueprint $table) {
            $table->string('inegi_clave', 2)->nullable()->after('nombre')->comment('Clave de entidad INEGI (01-32)');
        });

        Schema::table('municipalities', function (Blueprint $table) {
            $table->string('inegi_clave', 3)->nullable()->after('nombre')->comment('Clave de municipio INEGI (001+)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('municipalities', function (Blueprint $table) {
            $table->dropColumn('inegi_clave');
        });

        Schema::table('states', function (Blueprint $table) {
            $table->dropColumn('inegi_clave');
        });
    }
};
