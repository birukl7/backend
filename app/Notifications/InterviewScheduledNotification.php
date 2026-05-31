<?php

namespace App\Notifications;

use App\Models\Interview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InterviewScheduledNotification extends Notification implements ShouldQueue
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

        $mail = (new MailMessage)
            ->subject('Interview invitation — '.($vacancy?->title ?? 'Position'))
            ->greeting('Hello '.$notifiable->name.'!')
            ->line('You have been invited to an interview.')
            ->line('**Position:** '.($vacancy?->title ?? 'N/A'))
            ->line('**Employer:** '.($this->interview->employer?->name ?? 'Employer'))
            ->line('**Scheduled for:** '.$when);

        if ($this->interview->notes) {
            $mail->line('**Notes:** '.$this->interview->notes);
        }

        return $mail
            ->action('Join interview room', route('interviews.join', $this->interview))
            ->line('Please join a few minutes before the scheduled time.');
    }
}
