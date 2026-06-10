<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Promovido extends Model
{
    use HasFactory;

    protected $table = 'promovidos';

    protected $fillable = [
        'nombre',
        'apellidos',
        'clave_elector',
        'telefono',
        'seccion_electoral',
        'colonia',
        'foto',
        'promotor_id',
    ];

    /**
     * Accessor para compatibilidad: devuelve nombre + apellidos juntos.
     * Esto permite que el ApoyosDrawer siga mostrando el nombre completo.
     */
    protected $appends = ['nombre_completo'];

    public function getNombreCompletoAttribute(): string
    {
        return trim($this->nombre . ' ' . $this->apellidos);
    }

    /**
     * Obtener el promotor (Usuario) asignado a este promovido.
     */
    public function promotor()
    {
        return $this->belongsTo(User::class, 'promotor_id');
    }

    /**
     * Obtener los apoyos otorgados a este promovido.
     */
    public function apoyos()
    {
        return $this->hasMany(Apoyo::class);
    }
}
