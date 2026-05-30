<?php

namespace App\Models;

use App\Notifications\QueuedVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'name',
    'email',
    'password',
    'google_id',
    'profile_photo',
    'headline',
    'bio',
    'experience_years',
    'location',
    'company_name',
    'company_description',
    'company_website',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    /**
     * @var list<string>
     */
    protected $appends = [
        'avatar',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Public URL for the user's profile photo.
     */
    protected function avatar(): Attribute
    {
        return Attribute::get(function (): ?string {
            if ($this->profile_photo === null || $this->profile_photo === '') {
                return null;
            }

            if (str_starts_with($this->profile_photo, 'http://')
                || str_starts_with($this->profile_photo, 'https://')) {
                return $this->profile_photo;
            }

            return asset('storage/'.$this->profile_photo);
        });
    }

    public function hasPassword(): bool
    {
        return $this->password !== null && $this->password !== '';
    }

    /**
     * Send the email verification notification (queued).
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new QueuedVerifyEmail);
    }

    /**
     * Get all app notifications for this user, newest first.
     */
    public function appNotifications(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(AppNotification::class, 'user_id')->latest();
    }

    public function applications(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function vacancies(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Vacancy::class);
    }

    public function cvs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Cv::class);
    }
}
