<?php

namespace Database\Seeders;

use App\Models\Demarcacion;
use App\Models\SeccionElectoral;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CatalogoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            1 => [
                'nombre' => 'Demarcación 1 - Valle de Banderas',
                'secciones' => [91, 92, 96, 98, 109, 110, 114], 
                'total' => 400,
                'polygon' => 'POLYGON((-105.28 20.78, -105.26 20.74, -105.24 20.72, -105.19 20.75, -105.15 20.73, -105.14 20.77, -105.14 20.82, -105.22 20.82, -105.28 20.78))'
            ],
            2 => [
                'nombre' => 'Demarcación 2 - San Juan de Abajo',
                'secciones' => [112, 113, 973, 975, 980], 
                'total' => 1000,
                'polygon' => 'POLYGON((-105.14 20.95, -105.14 20.77, -105.15 20.73, -105.10 20.71, -105.02 20.75, -105.02 20.85, -105.08 20.94, -105.14 20.95))'
            ],
            3 => [
                'nombre' => 'Demarcación 3 - El Colomo',
                'secciones' => [118, 119], 
                'total' => 800,
                'polygon' => 'POLYGON((-105.35 20.91, -105.26 20.88, -105.14 20.88, -105.14 20.95, -105.22 20.96, -105.35 20.91))'
            ],
            4 => [
                'nombre' => 'Demarcación 4 - San José del Valle',
                'secciones' => [972, 974, 976, 978, 979], 
                'total' => 600,
                'polygon' => 'POLYGON((-105.35 20.77, -105.28 20.78, -105.22 20.82, -105.14 20.82, -105.14 20.88, -105.26 20.88, -105.35 20.77))'
            ],
            5 => [
                'nombre' => 'Demarcación 5 - Jarretaderas',
                'secciones' => [121, 122, 123, 977, 981], 
                'total' => 700,
                'polygon' => 'POLYGON((-105.20 20.67, -105.15 20.68, -105.15 20.73, -105.19 20.75, -105.20 20.71, -105.20 20.67))'
            ],
            6 => [
                'nombre' => 'Demarcación 6 - Mezcales',
                'secciones' => [115, 120], 
                'total' => 500,
                'polygon' => 'POLYGON((-105.28 20.70, -105.28 20.67, -105.24 20.67, -105.24 20.72, -105.26 20.74, -105.28 20.70))'
            ],
            7 => [
                'nombre' => 'Demarcación 7 - El Porvenir',
                'secciones' => [116, 117], 
                'total' => 450,
                'polygon' => 'POLYGON((-105.24 20.67, -105.20 20.67, -105.20 20.71, -105.24 20.72, -105.24 20.67))'
            ],
            8 => [
                'nombre' => 'Demarcación 8 - Bucerías',
                'secciones' => [105, 106, 107, 108, 111], 
                'total' => 900,
                'polygon' => 'POLYGON((-105.35 20.77, -105.35 20.70, -105.28 20.70, -105.26 20.74, -105.28 20.78, -105.35 20.77))'
            ],
            9 => [
                'nombre' => 'Demarcación 9 - Sayulita/Mita/Cruz',
                'secciones' => [93, 94, 95, 97, 99, 100, 101, 102, 103, 104], 
                'total' => 1200,
                'polygon' => 'POLYGON((-105.56 20.78, -105.52 20.85, -105.42 20.92, -105.35 20.91, -105.35 20.77, -105.39 20.73, -105.45 20.71, -105.56 20.78))'
            ],
        ];

        $driver = DB::getDriverName();
        $defaultMunicipalityId = DB::table('municipalities')->first()->id ?? 1;

        foreach ($data as $demarcacionId => $info) {
            if ($driver === 'mysql') {
                $geomSql = "ST_Transform(ST_GeomFromText('{$info['polygon']}', 4326, 'axis-order=long-lat'), 32613)";
            } else {
                $geomSql = "ST_Transform(ST_GeomFromText('{$info['polygon']}', 4326), 32613)";
            }

            $demarcacion = Demarcacion::updateOrCreate(
                ['id' => $demarcacionId],
                [
                    'nombre' => $info['nombre'],
                    'meta' => $info['total'],
                    'geom' => DB::raw($geomSql),
                    'municipality_id' => $defaultMunicipalityId
                ]
            );

            $sectionsCount = count($info['secciones']);
            $sectionMeta = $sectionsCount > 0 ? (int)round($info['total'] / $sectionsCount) : 0;

            // Sort sections to ensure deterministic partition mapping
            $seccionesNumeros = $info['secciones'];
            sort($seccionesNumeros);

            // Calculate bounding box of demarcation polygon to partition it
            preg_match_all('/-?\d+\.\d+\s+-?\d+\.\d+/', $info['polygon'], $matches);
            $points = [];
            foreach ($matches[0] as $match) {
                $parts = preg_split('/\s+/', $match);
                $points[] = ['x' => (float)$parts[0], 'y' => (float)$parts[1]];
            }
            
            $xs = array_column($points, 'x');
            $ys = array_column($points, 'y');
            $xmin = min($xs);
            $xmax = max($xs);
            $ymin = min($ys);
            $ymax = max($ys);
            
            $width = $xmax - $xmin;
            $height = $ymax - $ymin;
            $useVerticalSlices = $width > $height;

            foreach ($seccionesNumeros as $index => $numero) {
                $seccion = SeccionElectoral::updateOrCreate(
                    [
                        'numero' => (string)$numero,
                        'demarcacion_id' => $demarcacion->id
                    ],
                    [
                        'meta' => $sectionMeta
                    ]
                );

                if ($sectionsCount === 1) {
                    if ($driver === 'mysql') {
                        $geomSql = "ST_Transform(ST_GeomFromText('{$info['polygon']}', 4326, 'axis-order=long-lat'), 32613)";
                    } else {
                        $geomSql = "ST_Transform(ST_GeomFromText('{$info['polygon']}', 4326), 32613)";
                    }
                } else {
                    if ($useVerticalSlices) {
                        $xStart = $xmin + ($index * $width / $sectionsCount);
                        $xEnd = $xmin + (($index + 1) * $width / $sectionsCount);
                        $yStart = $ymin - 0.05;
                        $yEnd = $ymax + 0.05;
                    } else {
                        $xStart = $xmin - 0.05;
                        $xEnd = $xmax + 0.05;
                        $yStart = $ymin + ($index * $height / $sectionsCount);
                        $yEnd = $ymin + (($index + 1) * $height / $sectionsCount);
                    }
                    $sliceWkt = "POLYGON(({$xStart} {$yStart}, {$xEnd} {$yStart}, {$xEnd} {$yEnd}, {$xStart} {$yEnd}, {$xStart} {$yStart}))";
                    
                    if ($driver === 'mysql') {
                        $geomSql = "ST_Intersection((SELECT geom FROM demarcaciones WHERE id = {$demarcacion->id}), ST_Transform(ST_GeomFromText('{$sliceWkt}', 4326, 'axis-order=long-lat'), 32613))";
                    } else {
                        $geomSql = "ST_Intersection((SELECT geom FROM demarcaciones WHERE id = {$demarcacion->id}), ST_Transform(ST_GeomFromText('{$sliceWkt}', 4326), 32613))";
                    }
                }

                $seccion->update([
                    'geom' => DB::raw($geomSql)
                ]);
            }
        }
    }
}
