<?php

namespace App\Enums;

enum UserRole: string
{
    case SUPERUSER = 'superuser';
    case ADMIN = 'admin';
    case PRESIDENTE = 'presidente';
    case COORDINADOR_DISTRITO = 'coordinador_distrito';
    case RD = 'rd';
    case OPERADOR = 'operador';
    case PROMOTOR = 'promotor';

    /**
     * Retorna una etiqueta amigable y legible para el rol.
     */
    public function label(): string
    {
        return match ($this) {
            self::SUPERUSER => 'Súper Usuario',
            self::ADMIN => 'Administrador',
            self::PRESIDENTE => 'Presidente',
            self::COORDINADOR_DISTRITO => 'Coordinador de Distrito',
            self::RD => 'Responsable de Demarcación',
            self::OPERADOR => 'Operador Político',
            self::PROMOTOR => 'Promotor',
        };
    }

    /**
     * Retorna un arreglo con todos los valores (strings) del enum.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Verifica si el rol tiene nivel de súper usuario o administrador.
     */
    public function isAdmin(): bool
    {
        return in_array($this, [self::SUPERUSER, self::ADMIN], true);
    }

    /**
     * Verifica si el rol es administrativo o directivo (Superuser, Admin, Presidente, Coordinador de Distrito).
     */
    public function isManagement(): bool
    {
        return in_array($this, [self::SUPERUSER, self::ADMIN, self::PRESIDENTE, self::COORDINADOR_DISTRITO], true);
    }

    /**
     * Verifica si el rol puede gestionar la estructura hacia abajo.
     */
    public function canManageStructure(): bool
    {
        return in_array($this, [self::SUPERUSER, self::ADMIN, self::PRESIDENTE, self::COORDINADOR_DISTRITO, self::RD, self::OPERADOR], true);
    }
}
