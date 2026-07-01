<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class Municipality extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'municipalities';

    protected $fillable = [
        'state_id',
        'nombre',
    ];

    /**
     * Get the state this municipality belongs to.
     */
    public function state()
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    /**
     * Get the demarcations for this municipality.
     */
    public function demarcaciones()
    {
        return $this->hasMany(Demarcacion::class, 'municipality_id');
    }
}
