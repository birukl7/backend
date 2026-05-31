<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Application $application,
        public string $status,
    ) {
        $this->application->loadMissing(['vacancy', 'user']);
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $jobTitle = $this->application->vacancy?->title ?? 'the position';

        [$subject, $lines, $actionLabel, $actionUrl] = match ($this->status) {
            'shortlisted' => [
                'You have been shortlisted — '.$jobTitle,
                [
                    'Great news! Your application has been shortlisted.',
                    'The employer is interested in moving forward with your candidacy.',
                ],
                'View my applications',
                url('/my-applications'),
            ],
            'hired' => [
                'Congratulations — you have been hired for '.$jobTitle,
                [
                    'Congratulations! You have been selected for this role.',
                    'The employer will reach out with next steps.',
                ],
                'View my applications',
                url('/my-applications'),
            ],
            'rejected' => [
                'Application update — '.$jobTitle,
                [
                    'Thank you for your interest in this position.',
                    'After careful review, the employer has decided not to move forward with your application at this time.',
                ],
                'Browse more jobs',
                url('/jobs'),
            ],
            default => [
                'Application status updated — '.$jobTitle,
                ['Your application status has been updated to: '.$this->status.'.'],
                'View my applications',
                url('/my-applications'),
            ],
        };

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting('Hello '.$notifiable->name.'!');

        foreach ($lines as $line) {
            $mail->line($line);
        }

        return $mail->action($actionLabel, $actionUrl);
    }
}
