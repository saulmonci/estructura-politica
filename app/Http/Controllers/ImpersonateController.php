<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonateController extends Controller
{
    /**
     * Iniciar la suplantación de un usuario (Impersonate).
     */
    public function take(Request $request, User $user)
    {
        $currentUser = $request->user();

        // Verificar si ya está impersonando a alguien
        if ($request->session()->has('impersonated_by')) {
            return back()->with('error', 'Ya estás en modo de suplantación. Primero debes regresar a tu cuenta original.');
        }

        // Verificar autorización (Por el momento solo superuser)
        if (!$currentUser->canImpersonate($user)) {
            abort(403, 'No tienes permisos para impersonar a este usuario.');
        }

        // Guardar el ID del usuario original
        $originalUserId = $currentUser->id;

        // Registrar la actividad en la bitácora
        ActivityLog::create([
            'user_id' => $originalUserId,
            'user_identifier' => sprintf('%s - %s (%s)', $currentUser->id, $currentUser->name ?? $currentUser->nombre, $currentUser->role),
            'action' => 'impersonate_start',
            'model_type' => User::class,
            'model_friendly_name' => 'Usuario',
            'model_id' => $user->id,
            'model_representation' => sprintf('%s (%s)', $user->name ?? ($user->nombre . ' ' . $user->apellidos), $user->role),
            'changed_data' => [
                'target_user_id' => $user->id,
                'target_user_email' => $user->email,
                'target_user_role' => $user->role,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'presidente_id' => $currentUser->getPresidenteId(),
        ]);

        // Autenticar como el usuario objetivo (Laravel regenera sesión al hacer login)
        Auth::login($user);

        // Almacenar el id del usuario original en la nueva sesión creada tras el login
        $request->session()->put('impersonated_by', $originalUserId);

        return redirect()->route('dashboard')->with('success', "Ahora estás navegando como " . ($user->name ?? $user->nombre) . " ({$user->role}).");
    }

    /**
     * Detener la suplantación y regresar a la cuenta original.
     */
    public function leave(Request $request)
    {
        if (!$request->session()->has('impersonated_by')) {
            return redirect()->route('dashboard');
        }

        $originalUserId = $request->session()->get('impersonated_by');
        $targetUser = $request->user();

        // IMPORTANTE: Desactivar Scopes Globales (TerritoryScope) al buscar el usuario original,
        // ya que la sesión actual tiene los permisos del usuario suplantado y filtraría al superuser.
        $originalUser = User::withoutGlobalScopes()->find($originalUserId);

        if (!$originalUser) {
            $request->session()->forget('impersonated_by');
            return redirect()->route('dashboard')->with('error', 'Usuario original no encontrado.');
        }

        // Registrar fin de la suplantación en la bitácora
        ActivityLog::create([
            'user_id' => $originalUserId,
            'user_identifier' => sprintf('%s - %s (%s)', $originalUser->id, $originalUser->name ?? $originalUser->nombre, $originalUser->role),
            'action' => 'impersonate_stop',
            'model_type' => User::class,
            'model_friendly_name' => 'Usuario',
            'model_id' => $targetUser->id,
            'model_representation' => sprintf('%s (%s)', $targetUser->name ?? ($targetUser->nombre . ' ' . $targetUser->apellidos), $targetUser->role),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'presidente_id' => $originalUser->getPresidenteId(),
        ]);

        // Limpiar la clave de la sesión
        $request->session()->forget('impersonated_by');

        // Volver a autenticar con el usuario original
        Auth::login($originalUser);

        return redirect()->route('dashboard')->with('success', "Has regresado a tu cuenta de {$originalUser->role}.");
    }

    /**
     * Buscar usuarios para la función de impersonate (con filtro de municipio).
     */
    public function search(Request $request)
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->canImpersonate()) {
            return response()->json([], 403);
        }

        $query = $request->input('q');
        $municipalityId = $request->input('municipality_id');

        $usersQuery = User::withoutGlobalScopes()
            ->with(['municipality:id,nombre', 'demarcacion:id,nombre'])
            ->where('id', '!=', $currentUser->id);

        // Si es presidente (para uso futuro si se habilita canImpersonate en presidente):
        if ($currentUser->role === 'presidente') {
            $usersQuery->where('presidente_id', $currentUser->id)
                ->whereNotIn('role', ['superuser', 'admin', 'presidente']);
        }

        // Filtro por municipio
        if ($municipalityId) {
            $usersQuery->where('municipality_id', $municipalityId);
        }

        // Filtro por término de búsqueda (nombre, email, id, clave electoral)
        if (!empty($query)) {
            $usersQuery->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('nombre', 'like', "%{$query}%")
                  ->orWhere('apellidos', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%")
                  ->orWhere('clave_electoral', 'like', "%{$query}%")
                  ->orWhere('id', 'like', "%{$query}%");
            });
        }

        $users = $usersQuery
            ->orderBy('name')
            ->orderBy('nombre')
            ->limit(15)
            ->get();

        $formatted = $users->map(function ($u) use ($currentUser) {
            $displayName = $u->name ?? trim(($u->nombre ?? '') . ' ' . ($u->apellidos ?? ''));
            if (empty($displayName)) {
                $displayName = 'Usuario #' . $u->id;
            }

            return [
                'id' => $u->id,
                'name' => $displayName,
                'email' => $u->email,
                'role' => $u->role,
                'municipality_name' => $u->municipality?->nombre,
                'demarcacion_name' => $u->demarcacion?->nombre,
                'can_be_impersonated' => $currentUser->canImpersonate($u),
            ];
        });

        return response()->json($formatted);
    }
}

