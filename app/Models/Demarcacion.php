<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class Demarcacion extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'demarcaciones';

    protected $fillable = [
        'id',
        'nombre',
        'meta',
        'geom',
    ];

    /**
     * Get the sections for this demarcation.
     */
    public function secciones()
    {
        return $this->hasMany(SeccionElectoral::class, 'demarcacion_id');
    }
}
