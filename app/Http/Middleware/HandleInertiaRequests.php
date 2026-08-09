<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            if ($user->role === \App\Enums\UserRole::COORDINADOR_DISTRITO && (empty($user->presidente_id) || empty($user->parent_id))) {
                $presId = $user->getPresidenteId();
                if ($presId) {
                    $parent = \App\Models\User::withoutGlobalScopes()->find($presId);
                    if ($parent) {
                        $user->parent_id = $user->parent_id ?: $parent->id;
                        $user->presidente_id = $parent->id;
                        $user->state_id = $user->state_id ?: $parent->state_id;
                        $user->municipality_id = $user->municipality_id ?: $parent->municipality_id;
                        $user->scope_level = $user->scope_level ?: ($parent->scope_level ?: 'municipal');
                        $user->saveQuietly();
                    }
                }
            }

            // Eager load relations for UI convenience
            $user->loadMissing(['state', 'municipality', 'demarcacion', 'presidente']);
        }

        $impersonatedBy = $request->session()->get('impersonated_by');
        $impersonator = $impersonatedBy ? \App\Models\User::withoutGlobalScopes()->find($impersonatedBy) : null;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'is_impersonating' => !empty($impersonatedBy),
                'impersonator' => $impersonator ? [
                    'id' => $impersonator->id,
                    'name' => $impersonator->name ?? trim(($impersonator->nombre ?? '') . ' ' . ($impersonator->apellidos ?? '')),
                    'role' => $impersonator->role,
                ] : null,
                'can_impersonate' => $user ? $user->canImpersonate() : false,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
