<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Crear tabla de Estados
        Schema::create('states', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->timestamps();
        });

        // 2. Crear tabla de Municipios
        Schema::create('municipalities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('state_id')->constrained('states')->onDelete('cascade');
            $table->string('nombre');
            $table->timestamps();
            
            $table->unique(['state_id', 'nombre']);
        });

        // 3. Alterar tabla de Demarcaciones
        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->foreignId('municipality_id')->nullable()->after('id')->constrained('municipalities')->onDelete('cascade');
        });

        // 4. Poblar datos por defecto para no romper integridad existente
        $stateId = DB::table('states')->insertGetId([
            'nombre' => 'Estado por Defecto',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        $municipalityId = DB::table('municipalities')->insertGetId([
            'state_id' => $stateId,
            'nombre' => 'Municipio por Defecto',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Asignamos todas las demarcaciones existentes al municipio por defecto
        DB::table('demarcaciones')->whereNull('municipality_id')->update([
            'municipality_id' => $municipalityId
        ]);

        // Modificamos la columna para que sea NOT NULL tras el backfill
        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->foreignId('municipality_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('demarcaciones', function (Blueprint $table) {
            $table->dropForeign(['municipality_id']);
            $table->dropColumn('municipality_id');
        });

        Schema::dropIfExists('municipalities');
        Schema::dropIfExists('states');
    }
};
