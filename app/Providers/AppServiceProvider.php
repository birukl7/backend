<?php

namespace App\Providers;

use App\Notifications\EmailVerifiedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureSignedUrls();
        $this->configureEventListeners();
    }

    /**
     * Always sign verification links with APP_URL so Gmail links validate correctly.
     */
    protected function configureSignedUrls(): void
    {
        VerifyEmail::createUrlUsing(function (object $notifiable): string {
            $this->applyAppUrlForSigning();

            return URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
            );
        });
    }

    /**
     * Force root URL/scheme used when generating signed routes (web + queue worker).
     */
    protected function applyAppUrlForSigning(): void
    {
        $appUrl = (string) config('app.url');

        if ($appUrl !== '') {
            URL::forceRootUrl(rtrim($appUrl, '/'));
        }

        if (str_starts_with($appUrl, 'https://')) {
            URL::forceScheme('https');
        }
    }

    protected function configureEventListeners(): void
    {
        Event::listen(Verified::class, function (Verified $event): void {
            $event->user->notify(new EmailVerifiedNotification);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Render sits behind a proxy / TLS terminator. Force HTTPS URL generation
        // in production so Vite assets and favicon links are not emitted as http.
        if (app()->isProduction()) {
            $this->applyAppUrlForSigning();
        }

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
