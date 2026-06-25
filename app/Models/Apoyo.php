<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Apoyo extends Model
{
    use HasFactory, LogsActivity;

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($apoyo) {
            if (empty($apoyo->presidente_id)) {
                if (auth()->check()) {
                    $apoyo->presidente_id = auth()->user()->getPresidenteId();
                } else {
                    $ownerPresidenteId = null;
                    if ($apoyo->promovido_id) {
                        $promovido = Promovido::find($apoyo->promovido_id);
                        if ($promovido) {
                            $ownerPresidenteId = $promovido->presidente_id;
                        }
                    } elseif ($apoyo->user_id) {
                        $user = User::find($apoyo->user_id);
                        if ($user) {
                            $ownerPresidenteId = $user->presidente_id;
                        }
                    }
                    if ($ownerPresidenteId) {
                        $apoyo->presidente_id = $ownerPresidenteId;
                    }
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
