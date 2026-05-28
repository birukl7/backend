<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewRescheduledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Interview $interview)
    {
        $this->interview->loadMissing(['application.vacancy', 'employer']);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $vacancy = $this->interview->application?->vacancy;
        $when = $this->interview->scheduled_at?->timezone($this->interview->timezone ?? 'UTC')
            ->format('l, F j, Y \a\t g:i A T');

        return (new MailMessage)
            ->subject('Interview rescheduled — '.($vacancy?->title ?? 'Position'))
            ->greeting('Hello '.$notifiable->name.'!')
            ->line('Your interview has been rescheduled.')
            ->line('**Position:** '.($vacancy?->title ?? 'N/A'))
            ->line('**New time:** '.$when)
            ->action('View interview', route('interviews.join', $this->interview))
            ->line('Please update your calendar accordingly.');
    }
}
