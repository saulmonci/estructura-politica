<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarRoomConfig extends Model
{
    use HasFactory;

    protected $table = 'war_room_configs';

    protected $fillable = [
        'presidente_id',
        'whatsapp_group_id',
        'whatsapp_phone',
        'reporte_matutino_enabled',
        'alertas_inactividad_enabled',
        'alertas_meta_enabled',
    ];

    protected $casts = [
        'reporte_matutino_enabled' => 'boolean',
        'alertas_inactividad_enabled' => 'boolean',
        'alertas_meta_enabled' => 'boolean',
    ];

    /**
     * El Presidente/Campaña dueño de esta configuración de War Room.
     */
    public function presidente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'presidente_id');
    }

    /**
     * Obtiene el destinatario prioritario para WhatsApp:
     * El ID del grupo de WhatsApp si existe, o el teléfono personal del Presidente.
     */
    public function getTargetRecipient(): ?string
    {
        return $this->whatsapp_group_id ?: $this->whatsapp_phone;
    }
}
