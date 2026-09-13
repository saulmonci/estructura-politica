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
            $table->index(
                ['presidente_id', 'demarcacion_id', 'created_at'],
                'promovidos_pres_dem_created_idx'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promovidos', function (Blueprint $table) {
            $table->dropIndex('promovidos_pres_dem_created_idx');
        });
    }
};
