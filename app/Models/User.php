<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'nombre', 'apellidos', 'email', 'password', 'role', 'parent_id',
    'sexo', 'calle', 'numero_exterior', 'numero_interior',
    'colonia', 'codigo_postal', 'demarcacion', 'clave_electoral', 'telefono',
    'curp', 'apodo', 'foto', 'estado', 'notas'
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected $appends = ['foto_url'];

    public function getFotoUrlAttribute()
    {
        return $this->foto ? asset('storage/' . $this->foto) : null;
    }

    /**
     * Obtener el líder inmediato del usuario.
     */
    public function leader()
    {
        return $this->belongsTo(User::class, 'parent_id')->select('id', 'name', 'email', 'role');
    }

    /**
     * Obtener los subordinados directos.
     */
    public function subordinates()
    {
        return $this->hasMany(User::class, 'parent_id');
    }

    /**
     * Relación de promovidos.
     * Si es promotor, es una relación directa.
     * Si es RD o Presidente, es a través de los promotores (subordinados).
     */
    public function promovidos()
    {
        if ($this->role === 'promotor') {
            return $this->hasMany(Promovido::class, 'promotor_id');
        }

        // Relación a través de los promotores para RDs
        return $this->hasManyThrough(
            Promovido::class,
            User::class,
            'parent_id',   // Llave foránea en la tabla intermedia (users) que apunta al líder (this)
            'promotor_id', // Llave foránea en la tabla de destino (promovidos) que apunta al promotor
            'id',          // Llave local en esta tabla (users)
            'id'           // Llave local en la tabla intermedia (users)
        );
    }

    /**
     * Consulta optimizada para obtener los promovidos bajo el alcance del usuario según su rol.
     * Este helper resuelve las limitaciones de Eloquent para consultas de más de 2 niveles (e.g. Presidente).
     */
    public function queryPromovidos()
    {
        if ($this->role === 'promotor') {
            return Promovido::where('promotor_id', $this->id);
        }

        if ($this->role === 'operador') {
            return Promovido::whereIn('promotor_id', function ($query) {
                $query->select('id')
                    ->from('users')
                    ->where('role', 'promotor')
                    ->where('parent_id', $this->id);
            });
        }

        if ($this->role === 'rd') {
            return Promovido::whereIn('promotor_id', function ($query) {
                $query->select('id')
                    ->from('users')
                    ->where('role', 'promotor')
                    ->whereIn('parent_id', function ($subQuery) {
                        $subQuery->select('id')
                            ->from('users')
                            ->where('role', 'operador')
                            ->where('parent_id', $this->id);
                    });
            });
        }

        if ($this->role === 'presidente') {
            return Promovido::whereIn('promotor_id', function ($query) {
                $query->select('id')
                    ->from('users')
                    ->where('role', 'promotor')
                    ->whereIn('parent_id', function ($subQuery) {
                        $subQuery->select('id')
                            ->from('users')
                            ->where('role', 'operador')
                            ->whereIn('parent_id', function ($rdQuery) {
                                $rdQuery->select('id')
                                    ->from('users')
                                    ->where('role', 'rd')
                                    ->where('parent_id', $this->id);
                            });
                    });
            });
        }

        return Promovido::whereRaw('1 = 0');
    }
}
