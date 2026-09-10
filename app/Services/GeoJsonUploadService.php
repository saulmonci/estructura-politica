<?php

namespace App\Services;

use App\Exceptions\InvalidGeoJsonException;
use Illuminate\Http\UploadedFile;

class GeoJsonUploadService
{
    public const MAX_FILE_SIZE_KB = 5120; // 5 MB

    /**
     * Extrae y valida la Geometry (Polygon|MultiPolygon) de un archivo GeoJSON subido.
     *
     * @param  array<string>  $allowedTypes  p.ej. ['Polygon'] o ['Polygon', 'MultiPolygon']
     * @return array{type: string, geometryJson: string}
     *
     * @throws InvalidGeoJsonException
     */
    public function extractGeometry(UploadedFile $file, array $allowedTypes): array
    {
        $raw = file_get_contents($file->getRealPath());
        $data = $raw === false ? null : json_decode($raw, true);

        if (! is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidGeoJsonException('El archivo no contiene un JSON válido.');
        }

        $geometry = $this->resolveGeometry($data);

        if (! isset($geometry['type']) || ! in_array($geometry['type'], $allowedTypes, true)) {
            $allowedStr = implode(' o ', $allowedTypes);
            throw new InvalidGeoJsonException(
                "El tipo de geometría debe ser {$allowedStr}. Se recibió: ".($geometry['type'] ?? 'desconocido').'.'
            );
        }

        if (! isset($geometry['coordinates']) || ! is_array($geometry['coordinates']) || empty($geometry['coordinates'])) {
            throw new InvalidGeoJsonException('La geometría no tiene coordenadas válidas.');
        }

        return [
            'type' => $geometry['type'],
            'geometryJson' => json_encode($geometry),
        ];
    }

    /**
     * @param  array<mixed>  $data
     * @return array<mixed>
     */
    private function resolveGeometry(array $data): array
    {
        $type = $data['type'] ?? null;

        if ($type === 'Feature') {
            if (! isset($data['geometry']) || ! is_array($data['geometry'])) {
                throw new InvalidGeoJsonException('El Feature no contiene una geometría.');
            }

            return $data['geometry'];
        }

        if ($type === 'FeatureCollection') {
            $features = $data['features'] ?? [];

            if (! is_array($features) || count($features) !== 1) {
                throw new InvalidGeoJsonException(
                    'La colección debe contener exactamente 1 feature (se encontraron '.(is_array($features) ? count($features) : 0).').'
                );
            }

            $feature = $features[0];

            if (! isset($feature['geometry']) || ! is_array($feature['geometry'])) {
                throw new InvalidGeoJsonException('El feature no contiene una geometría.');
            }

            return $feature['geometry'];
        }

        if (in_array($type, ['Polygon', 'MultiPolygon'], true)) {
            return $data;
        }

        throw new InvalidGeoJsonException('Estructura GeoJSON no reconocida (se esperaba Feature, FeatureCollection o Geometry).');
    }
}
