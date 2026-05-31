<?php

namespace App\Http\Responses;

use App\Support\RoleBasedRedirect;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        return $request->wantsJson()
            ? response()->json(['two_factor' => false])
            : redirect()->intended(RoleBasedRedirect::home($request));
    }
}
