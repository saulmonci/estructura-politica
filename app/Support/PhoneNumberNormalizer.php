<?php

namespace App\Support;

class PhoneNumberNormalizer
{
    /**
     * Limpia y extrae el número telefónico nacional estándar de México (10 dígitos).
     * Soporta prefijos internacionales (+52, 52, +521, 521), espacios, guiones y paréntesis.
     * Retorna null si el número no cuenta con al menos 10 dígitos.
     */
    public static function toNational10(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = self::cleanDigits($phone);

        if (strlen($digits) < 10) {
            return null;
        }

        // En México los números nacionales tienen exactamente 10 dígitos.
        // Si viene con prefijo de país 52 o prefijo móvil histórico 521, tomamos los últimos 10 dígitos.
        return substr($digits, -10);
    }

    /**
     * Elimina cualquier carácter no numérico de la cadena.
     */
    public static function cleanDigits(?string $phone): string
    {
        if ($phone === null) {
            return '';
        }

        return (string) preg_replace('/\D/', '', $phone);
    }

    /**
     * Determina si el teléfono proporcionado corresponde a un número nacional mexicano válido de 10 dígitos.
     */
    public static function isValid(?string $phone): bool
    {
        $national = self::toNational10($phone);

        return $national !== null && strlen($national) === 10;
    }

    /**
     * Retorna el número en formato internacional E.164 para México (+52XXXXXXXXXX).
     */
    public static function toE164Mexico(?string $phone): ?string
    {
        $national = self::toNational10($phone);

        if (! $national) {
            return null;
        }

        return '+52'.$national;
    }

    /**
     * Retorna el número en formato requerido por Evolution API / Baileys (52XXXXXXXXXX, sin '+').
     * Evolution API v2 espera el código de país '52' seguido de los 10 dígitos nacionales sin prefijo '+'
     * y sin el prefijo móvil histórico '1'.
     */
    public static function toEvolutionFormat(?string $phone): ?string
    {
        $national = self::toNational10($phone);

        if (! $national) {
            return null;
        }

        return '52'.$national;
    }
}
