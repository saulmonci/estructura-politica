<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;
use App\Models\Scopes\TerritoryScope;

class Promovido extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'promovidos';

    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope(new TerritoryScope);

        static::creating(function ($promovido) {
            if (empty($promovido->presidente_id)) {
                if (auth()->check()) {
                    $promovido->presidente_id = auth()->user()->getPresidenteId();
                } else if ($promovido->promotor_id) {
                    $promotor = User::find($promovido->promotor_id);
                    if ($promotor) {
                        $promovido->presidente_id = $promotor->getPresidenteId();
                    }
                }
            }

            // Resolver automáticamente state_id y municipality_id desde la demarcación
            if ($promovido->demarcacion_id) {
                $demarcacion = Demarcacion::find($promovido->demarcacion_id);
                if ($demarcacion) {
                    $promovido->municipality_id = $demarcacion->municipality_id;
                    $promovido->state_id = $demarcacion->municipality?->state_id;
                }
            }
        });

        static::saving(function ($promovido) {
            if ($promovido->isDirty('demarcacion_id') && $promovido->demarcacion_id) {
                $demarcacion = Demarcacion::find($promovido->demarcacion_id);
                if ($demarcacion) {
                    $promovido->municipality_id = $demarcacion->municipality_id;
                    $promovido->state_id = $demarcacion->municipality?->state_id;
                }
            }
        });
    }

    protected $fillable = [
        'nombre',
        'apellidos',
        'clave_elector',
        'curp',
        'telefono',
        'demarcacion_id',
        'state_id',
        'municipality_id',
        'seccion_electoral',
        'colonia',
        'calle',
        'numero',
        'codigo_postal',
        'foto',
        'promotor_id',
        'presidente_id',
    ];

    /**
     * Accessor para compatibilidad: devuelve nombre + apellidos juntos.
     * Esto permite que el ApoyosDrawer siga mostrando el nombre completo.
     */
    protected $appends = ['nombre_completo', 'foto_url'];

    public function getNombreCompletoAttribute(): string
    {
        return trim($this->nombre . ' ' . $this->apellidos);
    }

    public function getFotoUrlAttribute()
    {
        return $this->foto ? asset('storage/' . $this->foto) : null;
    }

    /**
     * Obtener el presidente raíz asignado a este promovido.
     */
    public function presidente()
    {
        return $this->belongsTo(User::class, 'presidente_id');
    }

    /**
     * Obtener el estado asignado a este promovido.
     */
    public function state()
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    /**
     * Obtener el municipio asignado a este promovido.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class, 'municipality_id');
    }

    /**
     * Obtener la demarcación asignada a este promovido.
     */
    public function demarcacion()
    {
        return $this->belongsTo(Demarcacion::class, 'demarcacion_id');
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
