<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdateMunicipalityCoordinatesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $coords = [
            // Nayarit (todos los 20 municipios)
            'Acaponeta' => ['lat' => 22.4963889, 'lng' => -105.3594444, 'zoom' => 12],
            'Ahuacatlán' => ['lat' => 21.0544444, 'lng' => -104.4827778, 'zoom' => 12],
            'Amatlán de Cañas' => ['lat' => 20.8066667, 'lng' => -104.4033333, 'zoom' => 12],
            'Bahía de Banderas' => ['lat' => 20.8000000, 'lng' => -105.2500000, 'zoom' => 11],
            'Compostela' => ['lat' => 21.2363889, 'lng' => -104.9002778, 'zoom' => 11],
            'Del Nayar' => ['lat' => 22.2500000, 'lng' => -104.6000000, 'zoom' => 10],
            'El Nayar' => ['lat' => 22.2500000, 'lng' => -104.6000000, 'zoom' => 10],
            'Huajicori' => ['lat' => 22.6397222, 'lng' => -105.3213889, 'zoom' => 11],
            'Ixtlán del Río' => ['lat' => 21.0375000, 'lng' => -104.3708333, 'zoom' => 12],
            'Jala' => ['lat' => 21.1683333, 'lng' => -104.4338889, 'zoom' => 12],
            'La Yesca' => ['lat' => 21.3188889, 'lng' => -104.0102778, 'zoom' => 10],
            'Rosamorada' => ['lat' => 22.1222222, 'lng' => -105.2063889, 'zoom' => 11],
            'Ruiz' => ['lat' => 21.9513889, 'lng' => -105.1438889, 'zoom' => 12],
            'San Blas' => ['lat' => 21.5402778, 'lng' => -105.2858333, 'zoom' => 11],
            'San Pedro Lagunillas' => ['lat' => 21.2197222, 'lng' => -104.7522222, 'zoom' => 12],
            'Santa María del Oro' => ['lat' => 21.3344444, 'lng' => -104.5872222, 'zoom' => 12],
            'Santiago Ixcuintla' => ['lat' => 21.8122222, 'lng' => -105.2088889, 'zoom' => 11],
            'Tecuala' => ['lat' => 22.3980556, 'lng' => -105.4586111, 'zoom' => 11],
            'Tepic' => ['lat' => 21.5038889, 'lng' => -104.8947222, 'zoom' => 12],
            'Tuxpan' => ['lat' => 21.9405556, 'lng' => -105.2961111, 'zoom' => 12],
            'Xalisco' => ['lat' => 21.4502778, 'lng' => -104.9005556, 'zoom' => 11],

            // Principales Ciudades / Municipios de México
            'Puerto Vallarta' => ['lat' => 20.6534000, 'lng' => -105.2253000, 'zoom' => 12],
            'Guadalajara' => ['lat' => 20.6596988, 'lng' => -103.3496092, 'zoom' => 12],
            'Zapopan' => ['lat' => 20.7167000, 'lng' => -103.3833000, 'zoom' => 12],
            'Monterrey' => ['lat' => 25.6866142, 'lng' => -100.3161126, 'zoom' => 12],
            'Puebla' => ['lat' => 19.0414398, 'lng' => -98.2062727, 'zoom' => 12],
            'Tijuana' => ['lat' => 32.5149469, 'lng' => -117.0382471, 'zoom' => 12],
            'León' => ['lat' => 21.1220915, 'lng' => -101.6820790, 'zoom' => 12],
            'Querétaro' => ['lat' => 20.5887932, 'lng' => -100.3898881, 'zoom' => 12],
            'Mérida' => ['lat' => 20.9673702, 'lng' => -89.5925857, 'zoom' => 12],
            'Cancún' => ['lat' => 21.1619080, 'lng' => -86.8515279, 'zoom' => 12],
            'Benito Juárez' => ['lat' => 21.1619080, 'lng' => -86.8515279, 'zoom' => 12],
            'Culiacán' => ['lat' => 24.8090650, 'lng' => -107.3940250, 'zoom' => 12],
            'Hermosillo' => ['lat' => 29.0729673, 'lng' => -110.9559192, 'zoom' => 12],
            'Aguascalientes' => ['lat' => 21.8852562, 'lng' => -102.2915677, 'zoom' => 12],
            'San Luis Potosí' => ['lat' => 22.1564699, 'lng' => -100.9855409, 'zoom' => 12],
            'Morelia' => ['lat' => 19.7059504, 'lng' => -101.1949829, 'zoom' => 12],
            'Toluca' => ['lat' => 19.2826097, 'lng' => -99.6556653, 'zoom' => 12],
            'Cuernavaca' => ['lat' => 18.9242090, 'lng' => -99.2215659, 'zoom' => 12],
            'Pachuca de Soto' => ['lat' => 20.1010608, 'lng' => -98.7591312, 'zoom' => 12],
            'Colima' => ['lat' => 19.2452341, 'lng' => -103.7240868, 'zoom' => 12],
            'Manzanillo' => ['lat' => 19.0522222, 'lng' => -104.3158333, 'zoom' => 12],
            'Mazatlán' => ['lat' => 23.2494141, 'lng' => -106.4111425, 'zoom' => 12],
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

        $this->command->info('Coordenadas de municipios actualizadas exitosamente.');
    }
}
