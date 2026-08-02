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
            // Eager load relations for UI convenience
            $user->loadMissing(['state', 'municipality', 'demarcacion']);
        }

        $impersonatedBy = $request->session()->get('impersonated_by');
        $impersonator = $impersonatedBy ? \App\Models\User::find($impersonatedBy) : null;

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
