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
            $table->string('seccion_electoral')->nullable()->after('demarcacion');
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->string('demarcacion')->nullable()->after('seccion_electoral');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('seccion_electoral');
        });

        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropColumn('demarcacion');
        });
    }
};
