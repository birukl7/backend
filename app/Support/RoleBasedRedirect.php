<?php

namespace App\Support;

use Illuminate\Http\Request;

class RoleBasedRedirect
{
    public static function home(Request $request): string
    {
        $user = $request->user();

        if ($user?->hasRole('admin')) {
            return route('admin.dashboard', absolute: false);
        }

        if ($user?->hasRole('job_seeker')) {
            return '/jobs';
        }

        return route('dashboard', absolute: false);
    }
}
