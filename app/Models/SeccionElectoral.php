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
        'state_id',
        'municipality_id',
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

    /**
     * Get president metas pivot relationship.
     */
    public function presidentes()
    {
        return $this->belongsToMany(User::class, 'seccion_electoral_presidente', 'seccion_electoral_id', 'presidente_id')
            ->withoutGlobalScopes()
            ->withPivot('meta')
            ->withTimestamps();
    }

    /**
     * Helper to get meta for a specific president, falling back to base meta.
     */
    public function getMetaForPresidente(?int $presidenteId): int
    {
        if ($presidenteId) {
            $meta = \Illuminate\Support\Facades\DB::table('seccion_electoral_presidente')
                ->where('seccion_electoral_id', $this->id)
                ->where('presidente_id', $presidenteId)
                ->value('meta');

            if ($meta !== null) {
                return (int) $meta;
            }
        }
        return (int) ($this->meta ?? 0);
    }
}
