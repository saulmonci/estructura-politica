<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Apoyo extends Model
{
    use HasFactory;

    protected $fillable = [
        'promovido_id',
        'fecha',
        'tipo_apoyo',
        'descripcion',
        'estado',
        'evidencia',
        'cantidad_monetaria',
    ];

    public function promovido()
    {
        return $this->belongsTo(Promovido::class);
    }
}
