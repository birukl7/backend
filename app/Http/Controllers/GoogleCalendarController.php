<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class GoogleCalendarController extends Controller
{
    private function callbackUrl(): string
    {
        return route('google.calendar.callback');
    }

    /**
     * Redirect the authenticated user to Google to grant Calendar access.
     */
    public function connect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->redirectUrl($this->callbackUrl())
            ->scopes(['https://www.googleapis.com/auth/calendar.events'])
            ->with([
                'access_type' => 'offline',
                'prompt'      => 'consent',
            ])
            ->redirect();
    }

    /**
     * Handle the OAuth callback, store calendar tokens, and redirect.
     */
    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')
                ->redirectUrl($this->callbackUrl())
                ->user();

            auth()->user()->update([
                'google_calendar_access_token'     => $googleUser->token,
                'google_calendar_refresh_token'    => $googleUser->refreshToken,
                'google_calendar_token_expires_at' => now()->addSeconds($googleUser->expiresIn ?? 3600),
            ]);

            return redirect()->route('interviews.index')
                ->with('success', 'Google Calendar connected! Your interviews will now sync automatically.');
        } catch (\Throwable $e) {
            return redirect()->route('interviews.index')
                ->with('error', 'Could not connect Google Calendar. Please try again.');
        }
    }

    /**
     * Revoke calendar access and remove stored tokens.
     */
    public function disconnect(): RedirectResponse
    {
        auth()->user()->update([
            'google_calendar_access_token'     => null,
            'google_calendar_refresh_token'    => null,
            'google_calendar_token_expires_at' => null,
        ]);

        return back()->with('success', 'Google Calendar disconnected.');
    }
}
