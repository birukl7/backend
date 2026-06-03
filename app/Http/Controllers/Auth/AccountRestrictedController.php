<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountRestrictedController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $status = $request->session()->pull('restricted_account_status')
            ?? $request->user()?->account_status
            ?? 'blocked';

        return Inertia::render('auth/account-restricted', [
            'account_status' => in_array($status, ['suspended', 'blocked'], true) ? $status : 'blocked',
            'support_email' => config('mail.from.address'),
            'can_logout' => $request->user() !== null,
        ]);
    }
}
