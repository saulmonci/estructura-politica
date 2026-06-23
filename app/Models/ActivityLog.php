<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'user_identifier',
        'action',
        'model_type',
        'model_friendly_name',
        'model_id',
        'model_representation',
        'original_data',
        'changed_data',
        'ip_address',
        'user_agent',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'original_data' => 'array',
            'changed_data' => 'array',
        ];
    }

    /**
     * Relación con el usuario que realizó la acción.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
