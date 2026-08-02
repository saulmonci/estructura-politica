<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckAccountStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 1. Si no hay usuario autenticado o es superuser/admin, continuar normalmente
        if (!$user || in_array($user->role, ['superuser', 'admin'])) {
            return $next($request);
        }

        $errorMessage = null;

        // 2. Si la cuenta del usuario actual está desactivada/inactiva (estado == false/0)
        if (isset($user->estado) && !$user->estado) {
            $errorMessage = 'Tu cuenta ha sido deshabilitada por el administrador.';
        }

        // 3. Si el usuario pertenece a la estructura de un presidente suspendido/inactivo
        if (!$errorMessage && $user->presidente_id && $user->role !== 'presidente') {
            $presidente = $user->presidente;
            if ($presidente && isset($presidente->estado) && !$presidente->estado) {
                $errorMessage = 'El acceso para tu estructura ha sido suspendido por el administrador.';
            }
        }

        if ($errorMessage) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->wantsJson()) {
                return response()->json(['message' => $errorMessage], 403);
            }

            return redirect()->route('login')->withErrors([
                'email' => $errorMessage,
            ]);
        }

        return $next($request);
    }
}
