<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['nombre_completo', 'clave_elector', 'telefono', 'seccion_electoral', 'colonia', 'promotor_id'])]
class Promovido extends Model
{
    use HasFactory;

    /**
     * El nombre de la tabla asociada al modelo.
     *
     * @var string
     */
    protected $table = 'promovidos';

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
