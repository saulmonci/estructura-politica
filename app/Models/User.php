<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Apoyo;
use App\Traits\LogsActivity;
use App\Models\Scopes\TerritoryScope;

#[Fillable([
    'name', 'nombre', 'apellidos', 'email', 'password', 'role', 'scope_level', 'candidate_type',
    'state_id', 'municipality_id', 'parent_id', 'presidente_id',
    'sexo', 'calle', 'numero_exterior', 'numero_interior',
    'colonia', 'codigo_postal', 'demarcacion_id', 'seccion_electoral', 'clave_electoral', 'telefono',
    'curp', 'apodo', 'foto', 'estado', 'notas'
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, LogsActivity, SoftDeletes;

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

    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope(new TerritoryScope);

        static::creating(function ($user) {
            if (empty($user->presidente_id)) {
                if (auth()->check()) {
                    $user->presidente_id = auth()->user()->getPresidenteId();
                } else if ($user->parent_id) {
                    $parent = User::find($user->parent_id);
                    if ($parent) {
                        $user->presidente_id = $parent->getPresidenteId();
                    }
                }
            }

            // Resolver automáticamente desde demarcación
            if ($user->demarcacion_id) {
                $demarcacion = Demarcacion::find($user->demarcacion_id);
                if ($demarcacion) {
                    $user->municipality_id = $demarcacion->municipality_id;
                    $user->state_id = $demarcacion->municipality?->state_id;
                }
            }

            // O resolver desde el municipio
            if ($user->municipality_id && empty($user->state_id)) {
                $municipality = Municipality::find($user->municipality_id);
                if ($municipality) {
                    $user->state_id = $municipality->state_id;
                }
            }
        });

        static::saving(function ($user) {
            if ($user->isDirty('demarcacion_id') && $user->demarcacion_id) {
                $demarcacion = Demarcacion::find($user->demarcacion_id);
                if ($demarcacion) {
                    $user->municipality_id = $demarcacion->municipality_id;
                    $user->state_id = $demarcacion->municipality?->state_id;
                }
            } elseif ($user->isDirty('municipality_id') && $user->municipality_id) {
                $municipality = Municipality::find($user->municipality_id);
                if ($municipality) {
                    $user->state_id = $municipality->state_id;
                }
            }
        });

        static::created(function ($user) {
            if ($user->role === 'presidente' && empty($user->presidente_id)) {
                $user->presidente_id = $user->id;
                $user->saveQuietly();
            }
        });
    }

    /**
     * Obtener el presidente raíz asignado a este usuario.
     */
    public function presidente()
    {
        return $this->belongsTo(User::class, 'presidente_id');
    }

    /**
     * Resuelve el ID del presidente raíz.
     */
    public function getPresidenteId()
    {
        if ($this->role === 'presidente') {
            return $this->id;
        }
        if ($this->presidente_id) {
            return $this->presidente_id;
        }
        // Fallback: resolver a través del líder inmediato
        $parent = $this->leader;
        if ($parent) {
            return $parent->getPresidenteId();
        }
        return null;
    }

    /**
     * Scope para filtrar usuarios por presidente.
     */
    public function scopeForPresidente($query, $presidenteId)
    {
        return $query->where('presidente_id', $presidenteId);
    }

    /**
     * Obtener el estado asignado a este usuario.
     */
    public function state()
    {
        return $this->belongsTo(State::class, 'state_id');
    }

    /**
     * Obtener el municipio asignado a este usuario.
     */
    public function municipality()
    {
        return $this->belongsTo(Municipality::class, 'municipality_id');
    }

    /**
     * Obtener la demarcación asignada a este usuario.
     */
    public function demarcacion()
    {
        return $this->belongsTo(Demarcacion::class, 'demarcacion_id');
    }

    /**
     * Obtener el líder inmediato del usuario.
     */
    public function leader()
    {
        return $this->belongsTo(User::class, 'parent_id')->select('id', 'name', 'email', 'role', 'parent_id', 'presidente_id');
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
     * Consulta para obtener los operadores bajo el alcance del usuario según su rol.
     */
    public function queryOperadores()
    {
        if (in_array($this->role, ['admin', 'superuser'])) {
            return User::where('role', 'operador'); // TerritoryScope applies automatically
        }

        if ($this->role === 'presidente') {
            return User::where('role', 'operador')->where('presidente_id', $this->id);
        }

        if ($this->role === 'rd') {
            return User::where('role', 'operador')->where('parent_id', $this->id);
        }

        return User::whereRaw('1 = 0');
    }

    /**
     * Consulta para obtener los promotores bajo el alcance del usuario según su rol.
     */
    public function queryPromotores()
    {
        if (in_array($this->role, ['admin', 'superuser'])) {
            return User::where('role', 'promotor'); // TerritoryScope applies automatically
        }

        if ($this->role === 'presidente') {
            return User::where('role', 'promotor')->where('presidente_id', $this->id);
        }

        if ($this->role === 'rd') {
            return User::where('role', 'promotor')
                ->where(function($query) {
                    $query->where('parent_id', $this->id)
                          ->orWhereIn('parent_id', function($subQuery) {
                              $subQuery->select('id')
                                  ->from('users')
                                  ->where('role', 'operador')
                                  ->where('parent_id', $this->id);
                          });
                });
        }

        if ($this->role === 'operador') {
            return User::where('parent_id', $this->id)->where('role', 'promotor');
        }

        return User::whereRaw('1 = 0');
    }

    /**
     * Consulta optimizada para obtener los promovidos bajo el alcance del usuario según su rol.
     * Este helper resuelve las limitaciones de Eloquent para consultas de más de 2 niveles.
     */
    public function queryPromovidos()
    {
        if (in_array($this->role, ['admin', 'superuser'])) {
            return Promovido::query(); // TerritoryScope applies automatically
        }

        if ($this->role === 'promotor') {
            return Promovido::where('promotor_id', $this->id);
        }

        if ($this->role === 'operador') {
            return Promovido::where(function($query) {
                // Promovidos directos (si se asignó al operador directamente)
                $query->where('promotor_id', $this->id)
                      // O promovidos a través de sus promotores
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', 'promotor')
                              ->where('parent_id', $this->id);
                      });
            });
        }

        if ($this->role === 'rd') {
            return Promovido::where(function($query) {
                // Promovidos directos
                $query->where('promotor_id', $this->id)
                      // O a través de sus operadores (si se les asignó como "promotor" en promovidos)
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', 'operador')
                              ->where('parent_id', $this->id);
                      })
                      // O a través de los promotores de su red
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', 'promotor')
                              ->where(function($q) {
                                  $q->where('parent_id', $this->id)
                                    ->orWhereIn('parent_id', function ($opQuery) {
                                        $opQuery->select('id')
                                            ->from('users')
                                            ->where('role', 'operador')
                                            ->where('parent_id', $this->id);
                                    });
                              });
                      });
            });
        }

        if ($this->role === 'presidente') {
            // El presidente tiene visibilidad de todos los promovidos de su estructura
            return Promovido::where('presidente_id', $this->id);
        }

        return Promovido::whereRaw('1 = 0');
    }

    /**
     * Apoyos recibidos directamente por este usuario (promotor).
     */
    public function apoyos()
    {
        return $this->hasMany(Apoyo::class, 'user_id');
    }
}
