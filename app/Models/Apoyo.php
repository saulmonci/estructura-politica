<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Apoyo extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($apoyo) {
            $promovido = $apoyo->promovido_id ? Promovido::find($apoyo->promovido_id) : null;
            $user = $apoyo->user_id ? User::find($apoyo->user_id) : null;

            if (empty($apoyo->presidente_id)) {
                if (auth()->check()) {
                    $apoyo->presidente_id = auth()->user()->getPresidenteId();
                } else {
                    $ownerPresidenteId = null;
                    if ($promovido) {
                        $ownerPresidenteId = $promovido->presidente_id;
                    } elseif ($user) {
                        $ownerPresidenteId = $user->presidente_id;
                    }
                    if ($ownerPresidenteId) {
                        $apoyo->presidente_id = $ownerPresidenteId;
                    }
                }
            }

            if (empty($apoyo->state_id)) {
                if ($promovido) {
                    $apoyo->state_id = $promovido->state_id;
                } elseif ($user) {
                    $apoyo->state_id = $user->state_id;
                }
            }

            if (empty($apoyo->municipality_id)) {
                if ($promovido) {
                    $apoyo->municipality_id = $promovido->municipality_id;
                } elseif ($user) {
                    $apoyo->municipality_id = $user->municipality_id;
                }
            }
        });
    }

    protected $fillable = [
        'promovido_id',
        'user_id',
        'fecha',
        'tipo_apoyo',
        'descripcion',
        'estado',
        'evidencia',
        'cantidad_monetaria',
        'presidente_id',
    ];

    /**
     * Agrega la URL pública de la evidencia en todas las respuestas JSON.
     */
    protected $appends = ['evidencia_url'];

    public function getEvidenciaUrlAttribute(): ?string
    {
        return $this->evidencia ? asset('storage/' . $this->evidencia) : null;
    }

    public function promovido()
    {
        return $this->belongsTo(Promovido::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function presidente()
    {
        return $this->belongsTo(User::class, 'presidente_id');
    }
}
