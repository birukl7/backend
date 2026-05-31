<?php

namespace App\Services;

use App\Models\Interview;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private const TOKEN_URL   = 'https://oauth2.googleapis.com/token';
    private const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    /**
     * Return a valid (possibly refreshed) access token, or null if unavailable.
     */
    public function getValidAccessToken(User $user): ?string
    {
        if (! $user->google_calendar_refresh_token) {
            return null;
        }

        // Refresh if expiry is unknown or within the next 5 minutes.
        if (
            ! $user->google_calendar_token_expires_at
            || now()->addMinutes(5)->gte($user->google_calendar_token_expires_at)
        ) {
            return $this->refreshAccessToken($user);
        }

        return $user->google_calendar_access_token;
    }

    /**
     * Exchange the stored refresh token for a new access token and persist it.
     */
    private function refreshAccessToken(User $user): ?string
    {
        try {
            $response = Http::asForm()->post(self::TOKEN_URL, [
                'client_id'     => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $user->google_calendar_refresh_token,
                'grant_type'    => 'refresh_token',
            ]);

            if ($response->failed()) {
                Log::warning('Google Calendar token refresh failed', [
                    'user_id' => $user->id,
                    'status'  => $response->status(),
                ]);
                return null;
            }

            $data      = $response->json();
            $expiresAt = now()->addSeconds($data['expires_in'] ?? 3600);

            $user->updateQuietly([
                'google_calendar_access_token'     => $data['access_token'],
                'google_calendar_token_expires_at' => $expiresAt,
            ]);

            return $data['access_token'];
        } catch (\Throwable $e) {
            Log::error('Google Calendar token refresh exception', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create a Google Calendar event and return the event ID, or null on failure.
     */
    public function createEvent(User $user, Interview $interview, string $summary): ?string
    {
        $token = $this->getValidAccessToken($user);
        if (! $token) {
            return null;
        }

        try {
            $response = Http::withToken($token)->post(self::EVENTS_BASE, $this->buildPayload($interview, $summary));

            if ($response->failed()) {
                Log::warning('Google Calendar create event failed', [
                    'user_id' => $user->id,
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);
                return null;
            }

            return $response->json('id');
        } catch (\Throwable $e) {
            Log::error('Google Calendar create event exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Update an existing Google Calendar event.
     */
    public function updateEvent(User $user, Interview $interview, string $eventId, string $summary): void
    {
        $token = $this->getValidAccessToken($user);
        if (! $token) {
            return;
        }

        try {
            $response = Http::withToken($token)
                ->put(self::EVENTS_BASE . '/' . $eventId, $this->buildPayload($interview, $summary));

            if ($response->failed()) {
                Log::warning('Google Calendar update event failed', [
                    'user_id'  => $user->id,
                    'event_id' => $eventId,
                    'status'   => $response->status(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Google Calendar update event exception', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Delete a Google Calendar event.
     */
    public function deleteEvent(User $user, string $eventId): void
    {
        $token = $this->getValidAccessToken($user);
        if (! $token) {
            return;
        }

        try {
            Http::withToken($token)->delete(self::EVENTS_BASE . '/' . $eventId);
        } catch (\Throwable $e) {
            Log::error('Google Calendar delete event exception', ['error' => $e->getMessage()]);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function buildPayload(Interview $interview, string $summary): array
    {
        $start    = $interview->scheduled_at;
        $end      = $start->copy()->addHour();
        $timezone = $interview->timezone ?? 'UTC';

        $description = "Interview via Jitsi Meet\n\nJoin link: {$interview->meeting_link}";
        if ($interview->notes) {
            $description .= "\n\nNotes: {$interview->notes}";
        }

        return [
            'summary'     => $summary,
            'description' => $description,
            'start'       => ['dateTime' => $start->toRfc3339String(), 'timeZone' => $timezone],
            'end'         => ['dateTime' => $end->toRfc3339String(),   'timeZone' => $timezone],
            'reminders'   => [
                'useDefault' => false,
                'overrides'  => [
                    ['method' => 'email', 'minutes' => 60],
                    ['method' => 'popup', 'minutes' => 15],
                ],
            ],
        ];
    }
}
