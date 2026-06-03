<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * Routes accessible while the account is suspended or blocked.
     *
     * @var list<string>
     */
    private const EXEMPT_ROUTE_NAMES = [
        'account.restricted',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->hasRole('admin')) {
            return $next($request);
        }

        if (! $user->isAccountRestricted()) {
            return $next($request);
        }

        if ($request->routeIs(self::EXEMPT_ROUTE_NAMES)) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Your account has been restricted. Please contact an administrator.',
            ], 403);
        }

        return redirect()->route('account.restricted');
    }
}
