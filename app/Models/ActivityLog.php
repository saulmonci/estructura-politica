<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActivityLog extends Model
{
    use SoftDeletes;

    protected $table = 'activity_logs';

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($log) {
            if ($log->user_id) {
                $user = User::find($log->user_id);
                if ($user) {
                    if (empty($log->presidente_id)) {
                        $log->presidente_id = $user->getPresidenteId();
                    }
                    if (empty($log->state_id)) {
                        $log->state_id = $user->state_id;
                    }
                    if (empty($log->municipality_id)) {
                        $log->municipality_id = $user->municipality_id;
                    }
                }
            }
        });
    }

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
        'presidente_id',
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
