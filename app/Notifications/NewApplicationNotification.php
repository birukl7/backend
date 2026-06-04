<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewApplicationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Application $application)
    {
        $this->application->loadMissing(['vacancy', 'user']);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $jobTitle = $this->application->vacancy?->title ?? 'your job posting';
        $applicantName = $this->application->user?->name ?? 'A candidate';

        $mail = (new MailMessage)
            ->subject('New application — '.$jobTitle)
            ->greeting('Hello '.$notifiable->name.'!')
            ->line($applicantName.' has applied for **'.$jobTitle.'**.');

        if ($this->application->status !== 'pending') {
            $mail->line('Initial status: **'.$this->application->status.'**.');
        }

        return $mail
            ->action('Review applications', url('/employer/applications'))
            ->line('Log in to review their CV and take the next step.');
    }
}
