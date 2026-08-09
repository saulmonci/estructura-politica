<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class Municipality extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'municipalities';

    protected $fillable = [
        'state_id',
        'nombre',
        'inegi_clave',
        'lat',
        'lng',
        'zoom',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'zoom' => 'integer',
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
