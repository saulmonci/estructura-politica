<?php

namespace App\Exceptions;

use RuntimeException;

class UnresolvableMunicipalityException extends RuntimeException
{
    public static function forPresidenteAndMunicipality(?int $presidenteId = null, ?int $municipalityId = null): self
    {
        return new self(sprintf(
            'No se pudo resolver un municipio válido para el War Room. Presidente ID recibido: %s, Municipio ID recibido: %s.',
            $presidenteId !== null ? (string) $presidenteId : 'ninguno',
            $municipalityId !== null ? (string) $municipalityId : 'ninguno'
        ));
    }
}
