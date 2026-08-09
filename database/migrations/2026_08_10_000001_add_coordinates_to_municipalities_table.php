<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('municipalities', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable()->after('nombre');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
            $table->integer('zoom')->nullable()->default(11)->after('lng');
        });

        // Coordenadas base para municipios de Nayarit y principales
        $coords = [
            'Bahía de Banderas' => ['lat' => 20.8000000, 'lng' => -105.2500000, 'zoom' => 11],
            'Tepic' => ['lat' => 21.5038889, 'lng' => -104.8947222, 'zoom' => 12],
            'Compostela' => ['lat' => 21.2363889, 'lng' => -104.9002778, 'zoom' => 11],
            'San Blas' => ['lat' => 21.5402778, 'lng' => -105.2858333, 'zoom' => 11],
            'Santiago Ixcuintla' => ['lat' => 21.8122222, 'lng' => -105.2088889, 'zoom' => 11],
            'Xalisco' => ['lat' => 21.4502778, 'lng' => -104.9005556, 'zoom' => 11],
            'Ixtlán del Río' => ['lat' => 21.0375000, 'lng' => -104.3708333, 'zoom' => 12],
            'Acaponeta' => ['lat' => 22.4963889, 'lng' => -105.3594444, 'zoom' => 12],
            'Tecuala' => ['lat' => 22.3980556, 'lng' => -105.4586111, 'zoom' => 11],
            'Ruiz' => ['lat' => 21.9513889, 'lng' => -105.1438889, 'zoom' => 12],
            'Rosamorada' => ['lat' => 22.1222222, 'lng' => -105.2063889, 'zoom' => 11],
            'Tuxpan' => ['lat' => 21.9405556, 'lng' => -105.2961111, 'zoom' => 12],
            'Jala' => ['lat' => 21.1683333, 'lng' => -104.4338889, 'zoom' => 12],
            'Ahuacatlán' => ['lat' => 21.0544444, 'lng' => -104.4827778, 'zoom' => 12],
            'Amatlán de Cañas' => ['lat' => 20.8066667, 'lng' => -104.4033333, 'zoom' => 12],
            'San Pedro Lagunillas' => ['lat' => 21.2197222, 'lng' => -104.7522222, 'zoom' => 12],
            'Santa María del Oro' => ['lat' => 21.3344444, 'lng' => -104.5872222, 'zoom' => 12],
            'La Yesca' => ['lat' => 21.3188889, 'lng' => -104.0102778, 'zoom' => 10],
            'Del Nayar' => ['lat' => 22.2500000, 'lng' => -104.6000000, 'zoom' => 10],
            'Huajicori' => ['lat' => 22.6397222, 'lng' => -105.3213889, 'zoom' => 11],
            'Puerto Vallarta' => ['lat' => 20.6534000, 'lng' => -105.2253000, 'zoom' => 12],
            'Guadalajara' => ['lat' => 20.6596988, 'lng' => -103.3496092, 'zoom' => 12],
            'Zapopan' => ['lat' => 20.7167000, 'lng' => -103.3833000, 'zoom' => 12],
        ];

        foreach ($coords as $muniNombre => $data) {
            DB::table('municipalities')
                ->where('nombre', $muniNombre)
                ->update([
                    'lat' => $data['lat'],
                    'lng' => $data['lng'],
                    'zoom' => $data['zoom'],
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('municipalities', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng', 'zoom']);
        });
    }
};
