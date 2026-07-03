<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class SeccionElectoral extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'secciones_electorales';

    protected $fillable = [
        'numero',
        'demarcacion_id',
        'geom',
        'meta',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($seccion) {
            if (empty($seccion->state_id) || empty($seccion->municipality_id)) {
                if ($seccion->demarcacion_id) {
                    $demarcacion = Demarcacion::find($seccion->demarcacion_id);
                    if ($demarcacion) {
                        if (empty($seccion->state_id)) {
                            $seccion->state_id = $demarcacion->state_id;
                        }
                        if (empty($seccion->municipality_id)) {
                            $seccion->municipality_id = $demarcacion->municipality_id;
                        }
                    }
                }
            }
        });
    }

    /**
     * Get the demarcation that owns this section.
     */
    public function demarcacion()
    {
        return $this->belongsTo(Demarcacion::class, 'demarcacion_id');
    }
}
