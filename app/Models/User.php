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
use App\Enums\UserRole;

#[Fillable([
    'name', 'nombre', 'apellidos', 'email', 'password', 'role', 'scope_level', 'candidate_type',
    'state_id', 'municipality_id', 'parent_id', 'presidente_id',
    'sexo', 'calle', 'numero_exterior', 'numero_interior',
    'colonia', 'codigo_postal', 'demarcacion_id', 'demarcacion_asignada_id', 'seccion_electoral', 'clave_electoral', 'telefono',
    'curp', 'apodo', 'foto', 'ine_frente', 'ine_reverso', 'estado', 'notas'
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
            'estado' => 'boolean',
            'role' => UserRole::class,
        ];
    }

    protected $appends = ['foto_url', 'ine_frente_url', 'ine_reverso_url'];

    public function getFotoUrlAttribute()
    {
        return $this->foto ? asset('storage/' . $this->foto) : null;
    }

    public function getIneFrenteUrlAttribute()
    {
        return $this->ine_frente ? asset('storage/' . $this->ine_frente) : null;
    }

    public function getIneReversoUrlAttribute()
    {
        return $this->ine_reverso ? asset('storage/' . $this->ine_reverso) : null;
    }

    protected static function boot()
    {
        parent::boot();

        static::addGlobalScope(new TerritoryScope);

        static::creating(function ($user) {
            if (empty($user->presidente_id)) {
                if (!empty($user->parent_id)) {
                    $parent = User::find($user->parent_id);
                    if ($parent) {
                        $user->presidente_id = $parent->getPresidenteId();
                        $user->state_id = $user->state_id ?: $parent->state_id;
                        $user->municipality_id = $user->municipality_id ?: $parent->municipality_id;
                        $user->scope_level = $user->scope_level ?: ($parent->scope_level ?: 'municipal');
                    }
                } else if (auth()->check() && auth()->user()->getPresidenteId()) {
                    $presUser = auth()->user();
                    $user->presidente_id = $presUser->getPresidenteId();
                    $user->state_id = $user->state_id ?: $presUser->state_id;
                    $user->municipality_id = $user->municipality_id ?: $presUser->municipality_id;
                    $user->scope_level = $user->scope_level ?: ($presUser->scope_level ?: 'municipal');
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
            if ($user->role === UserRole::PRESIDENTE && empty($user->presidente_id)) {
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
        if ($this->role === UserRole::PRESIDENTE) {
            return $this->id;
        }
        if ($this->presidente_id) {
            return $this->presidente_id;
        }
        if ($this->parent_id) {
            $parent = User::withoutGlobalScopes()->find($this->parent_id);
            if ($parent) {
                return $parent->getPresidenteId();
            }
        }
        if ($this->role === UserRole::COORDINADOR_DISTRITO) {
            if ($this->municipality_id) {
                $pres = User::withoutGlobalScopes()->where('role', UserRole::PRESIDENTE)
                    ->where('municipality_id', $this->municipality_id)
                    ->first();
                if ($pres) return $pres->id;
            }
            if ($this->state_id) {
                $pres = User::withoutGlobalScopes()->where('role', UserRole::PRESIDENTE)
                    ->where('state_id', $this->state_id)
                    ->first();
                if ($pres) return $pres->id;
            }
            $firstPres = User::withoutGlobalScopes()->where('role', UserRole::PRESIDENTE)->first();
            if ($firstPres) return $firstPres->id;
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
     * Obtener la demarcación que el RD tiene a cargo.
     */
    public function demarcacionAsignada()
    {
        return $this->belongsTo(Demarcacion::class, 'demarcacion_asignada_id');
    }

    /**
     * Metas personalizadas de demarcaciones para este presidente.
     */
    public function demarcacionesMetas()
    {
        return $this->belongsToMany(Demarcacion::class, 'demarcacion_presidente', 'presidente_id', 'demarcacion_id')
            ->withPivot('meta')
            ->withTimestamps();
    }

    /**
     * Metas personalizadas de secciones electorales para este presidente.
     */
    public function seccionesMetas()
    {
        return $this->belongsToMany(SeccionElectoral::class, 'seccion_electoral_presidente', 'presidente_id', 'seccion_electoral_id')
            ->withPivot('meta')
            ->withTimestamps();
    }

    /**
     * Obtener el líder inmediato del usuario.
     */
    public function leader()
    {
        return $this->belongsTo(User::class, 'parent_id')->withoutGlobalScopes()->select('id', 'name', 'email', 'role', 'parent_id', 'presidente_id', 'state_id', 'municipality_id', 'scope_level');
    }

    /**
     * Obtener los subordinados directos.
     */
    public function subordinates()
    {
        return $this->hasMany(User::class, 'parent_id');
    }

    /**
     * RD: Relación para obtener todos los operadores de sus promotores (jerarquía directa de 2 niveles).
     */
    public function rdsPromotores()
    {
        return $this->hasManyThrough(
            User::class,   // Modelo final que queremos (Promotor)
            User::class,   // Modelo intermedio (Operador)
            'parent_id',   // Llave foránea en la tabla intermedia (users.parent_id = rd.id)
            'parent_id',   // Llave foránea en la tabla final (users.parent_id = operador.id)
            'id',          // Llave local en esta tabla (users)
            'id'           // Llave local en la tabla intermedia (users)
        );
    }

    /**
     * Relación de promovidos.
     * Si es promotor, es una relación directa.
     * Si es RD o Presidente, es a través de los promotores (subordinados).
     */
    public function promovidos()
    {
        if ($this->role === UserRole::PROMOTOR) {
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
        if (in_array($this->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            return User::where('role', UserRole::OPERADOR); // TerritoryScope applies automatically
        }

        if (in_array($this->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $this->getPresidenteId();
            return User::where('role', UserRole::OPERADOR)->where(function ($q) use ($presId) {
                $q->where('presidente_id', $presId)
                  ->orWhere('parent_id', $presId);
            });
        }

        if ($this->role === UserRole::RD) {
            return User::where('role', UserRole::OPERADOR)->where('parent_id', $this->id);
        }

        return User::whereRaw('1 = 0');
    }

    /**
     * Consulta para obtener los promotores bajo el alcance del usuario según su rol.
     */
    public function queryPromotores()
    {
        if (in_array($this->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            return User::where('role', UserRole::PROMOTOR); // TerritoryScope applies automatically
        }

        if (in_array($this->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $this->getPresidenteId();
            return User::where('role', UserRole::PROMOTOR)->where(function ($q) use ($presId) {
                $q->where('presidente_id', $presId)
                  ->orWhere('parent_id', $presId);
            });
        }

        if ($this->role === UserRole::RD) {
            return User::where('role', UserRole::PROMOTOR)
                ->where(function($query) {
                    $query->where('parent_id', $this->id)
                          ->orWhereIn('parent_id', function($subQuery) {
                              $subQuery->select('id')
                                  ->from('users')
                                  ->where('role', UserRole::OPERADOR)
                                  ->where('parent_id', $this->id);
                          });
                });
        }

        if ($this->role === UserRole::OPERADOR) {
            return User::where('parent_id', $this->id)->where('role', UserRole::PROMOTOR);
        }

        return User::whereRaw('1 = 0');
    }

    /**
     * Consulta para obtener los coordinadores de distrito bajo el alcance del usuario.
     */
    public function queryCoordinadores()
    {
        if (in_array($this->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            return User::where('role', UserRole::COORDINADOR_DISTRITO);
        }

        if ($this->role === UserRole::PRESIDENTE) {
            return User::where('role', UserRole::COORDINADOR_DISTRITO)->where(function ($q) {
                $q->where('presidente_id', $this->id)->orWhere('parent_id', $this->id);
            });
        }

        if ($this->role === UserRole::COORDINADOR_DISTRITO) {
            $presId = $this->getPresidenteId();
            return User::where('role', UserRole::COORDINADOR_DISTRITO)->where(function ($q) use ($presId) {
                $q->where('presidente_id', $presId)->orWhere('parent_id', $presId);
            });
        }

        return User::whereRaw('1 = 0');
    }

    /**
     * Consulta optimizada para obtener los promovidos bajo el alcance del usuario según su rol.
     * Este helper resuelve las limitaciones de Eloquent para consultas de más de 2 niveles.
     */
    public function queryPromovidos()
    {
        if (in_array($this->role, [UserRole::ADMIN, UserRole::SUPERUSER], true)) {
            return Promovido::query(); // TerritoryScope applies automatically
        }

        if ($this->role === UserRole::PROMOTOR) {
            return Promovido::where('promotor_id', $this->id);
        }

        if ($this->role === UserRole::OPERADOR) {
            return Promovido::where(function($query) {
                // Promovidos directos (si se asignó al operador directamente)
                $query->where('promotor_id', $this->id)
                      // O promovidos a través de sus promotores
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', UserRole::PROMOTOR)
                              ->where('parent_id', $this->id);
                      });
            });
        }

        if ($this->role === UserRole::RD) {
            return Promovido::where(function($query) {
                // Promovidos directos
                $query->where('promotor_id', $this->id)
                      // O a través de sus operadores (si se les asignó como "promotor" en promovidos)
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', UserRole::OPERADOR)
                              ->where('parent_id', $this->id);
                      })
                      // O a través de los promotores de su red
                      ->orWhereIn('promotor_id', function ($subQuery) {
                          $subQuery->select('id')
                              ->from('users')
                              ->where('role', UserRole::PROMOTOR)
                              ->where(function($q) {
                                  $q->where('parent_id', $this->id)
                                    ->orWhereIn('parent_id', function ($opQuery) {
                                        $opQuery->select('id')
                                            ->from('users')
                                            ->where('role', UserRole::OPERADOR)
                                            ->where('parent_id', $this->id);
                                    });
                              });
                      });
            });
        }

        if (in_array($this->role, [UserRole::PRESIDENTE, UserRole::COORDINADOR_DISTRITO], true)) {
            $presId = $this->getPresidenteId();
            return Promovido::where('presidente_id', $presId);
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

    /**
     * Determina si el usuario actual puede impersonar a otro usuario.
     * Por el momento restringido a 'superuser'. Preparado para habilitar 'presidente' en el futuro.
     */
    public function canImpersonate(?User $target = null): bool
    {
        // Roles autorizados (Actualmente solo superuser)
        // Para habilitar al presidente en el futuro, añadir UserRole::PRESIDENTE a $allowedRoles
        $allowedRoles = [UserRole::SUPERUSER];

        if (!in_array($this->role, $allowedRoles, true)) {
            return false;
        }

        if ($target) {
            // No se puede impersonar a sí mismo
            if ($target->id === $this->id) {
                return false;
            }

            // Validación jerárquica para cuando se habilite el rol 'presidente'
            if ($this->role === UserRole::PRESIDENTE) {
                if (in_array($target->role, [UserRole::SUPERUSER, UserRole::ADMIN, UserRole::PRESIDENTE], true)) {
                    return false;
                }
                return $target->presidente_id === $this->id;
            }
        }

        return true;
    }
}

