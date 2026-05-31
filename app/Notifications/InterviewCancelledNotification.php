<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewCancelledNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Interview $interview)
    {
        $this->interview->loadMissing(['application.vacancy']);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $vacancy = $this->interview->application?->vacancy;

        return (new MailMessage)
            ->subject('Interview cancelled — '.($vacancy?->title ?? 'Position'))
            ->greeting('Hello '.$notifiable->name.'!')
            ->line('An interview has been cancelled.')
            ->line('**Position:** '.($vacancy?->title ?? 'N/A'))
            ->line('You will be contacted if a new time is scheduled.')
            ->action('View my interviews', url('/my-interviews'));
    }
}
