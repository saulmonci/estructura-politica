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
        'municipality_id',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($demarcacion) {
            if (empty($demarcacion->municipality_id)) {
                $defaultMuni = Municipality::first();
                if (!$defaultMuni) {
                    $defaultState = State::firstOrCreate(['nombre' => 'Estado por Defecto']);
                    $defaultMuni = Municipality::create([
                        'state_id' => $defaultState->id,
                        'nombre' => 'Municipio por Defecto'
                    ]);
                }
                $demarcacion->municipality_id = $defaultMuni->id;
            }
        });
    }

    /**
     * Get the municipality this demarcation belongs to.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class, 'municipality_id');
    }

    /**
     * Get the sections for this demarcation.
     */
    public function secciones()
    {
        return $this->hasMany(SeccionElectoral::class, 'demarcacion_id');
    }
}
