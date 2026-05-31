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
    'employer_type',
    'national_id',
    'company_tin_number',
    'employer_verification_status',
    'employer_submitted_at',
    'employer_verified_at',
    'employer_verified_by',
    'employer_verification_notes',
    'company_phone',
    'company_contact_email',
    'company_verification_status',
    'business_license_status',
    'business_license_path',
    'kyc_verified',
    'tin_verified',
    'company_info_verified',
    'company_verification_notes',
    'company_submitted_at',
    'company_verified_at',
    'company_verified_by',
    'is_flagged_suspicious',
    'account_status',
    'security_notes',
    'security_flagged_at',
    'security_flagged_by',
    'status_changed_at',
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
            'employer_submitted_at' => 'datetime',
            'employer_verified_at' => 'datetime',
            'company_submitted_at' => 'datetime',
            'company_verified_at' => 'datetime',
            'kyc_verified' => 'boolean',
            'tin_verified' => 'boolean',
            'company_info_verified' => 'boolean',
            'is_flagged_suspicious' => 'boolean',
            'security_flagged_at' => 'datetime',
            'status_changed_at' => 'datetime',
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
