<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeccionElectoral extends Model
{
    use HasFactory;

    protected $table = 'secciones_electorales';

    protected $fillable = [
        'numero',
        'demarcacion_id',
        'geom',
        'meta',
    ];

    /**
     * Get the demarcation that owns this section.
     */
    public function demarcacion()
    {
        return $this->belongsTo(Demarcacion::class, 'demarcacion_id');
    }
}
