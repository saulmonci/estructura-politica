<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class State extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'states';

    protected $fillable = [
        'nombre',
    ];

    /**
     * Get the municipalities belonging to this state.
     */
    public function municipalities()
    {
        return $this->hasMany(Municipality::class, 'state_id');
    }
}
