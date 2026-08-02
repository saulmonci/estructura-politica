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
}
