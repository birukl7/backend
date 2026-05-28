<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to Google's OAuth consent screen.
     */
    public function redirect(Request $request): SymfonyRedirectResponse
    {
        if ($role = $request->query('role')) {
            $request->validate([
                'role' => ['required', 'string', Rule::in(['employer', 'job_seeker'])],
            ]);

            $request->session()->put('oauth_role', $role);
        }

        return Socialite::driver('google')->redirect();
    }

    /**
     * Handle the callback from Google.
     */
    public function callback(Request $request): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->user();

        $user = User::query()
            ->where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if ($user === null) {
            $roleName = $request->session()->pull('oauth_role', 'job_seeker');

            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->firstOrFail();

            $user = User::create([
                'name' => $googleUser->getName() ?? 'Google User',
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'password' => null,
                'email_verified_at' => now(),
                'profile_photo' => $this->storeGoogleAvatar($googleUser->getAvatar()),
            ]);

            $user->assignRole($role);
        } else {
            $user->forceFill([
                'google_id' => $user->google_id ?? $googleUser->getId(),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);

            if (! $user->name && $googleUser->getName()) {
                $user->name = $googleUser->getName();
            }

            if (! $user->profile_photo && $googleUser->getAvatar()) {
                $user->profile_photo = $this->storeGoogleAvatar($googleUser->getAvatar());
            }

            $user->save();
        }

        Auth::login($user, remember: true);

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Download and store the Google profile image, or return the remote URL on failure.
     */
    private function storeGoogleAvatar(?string $avatarUrl): ?string
    {
        if ($avatarUrl === null || $avatarUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout(10)->get($avatarUrl);

            if (! $response->successful()) {
                return $avatarUrl;
            }

            $path = 'profile-photos/'.Str::uuid().'.jpg';
            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (\Throwable) {
            return $avatarUrl;
        }
    }
}
