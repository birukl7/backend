<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Notifications\Notification;

class UserNotifier
{
    /**
     * Send an in-app notification and queue an email.
     */
    public static function notify(User $user, Notification $mailNotification, array $inApp): void
    {
        AppNotification::create([
            'user_id' => $user->id,
            'type'    => $inApp['type'],
            'title'   => $inApp['title'],
            'body'    => $inApp['body'],
            'data'    => $inApp['data'] ?? null,
        ]);

        $user->notify($mailNotification);
    }
}
