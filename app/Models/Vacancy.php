<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vacancy extends Model
{
    /** @use HasFactory<\Database\Factories\VacancyFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'requirements',
        'tags',
        'location',
        'salary_min',
        'salary_max',
        'employment_type',
        'status',
        'work_type',
        'application_deadline',
    ];

    protected $casts = [
        'tags'                 => 'array',
        'application_deadline' => 'date',
    ];

    protected $appends = ['is_expired'];

    public function applications(){
        return $this->hasMany(Application::class);
    }

    /**
     * The employer (poster) of this vacancy.
     */
    public function employer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Applications that resulted in a hire for this vacancy.
     */
    public function hires()
    {
        return $this->hasMany(Application::class)->where('status', 'hired');
    }

    public function screening()
    {
        return $this->hasOne(JobScreening::class);
    }

    public function screeningResponses()
    {
        return $this->hasMany(ScreeningResponse::class);
    }

    /**
     * Only vacancies whose application deadline has not passed yet.
     */
    public function scopeActive($query)
    {
        return $query->whereNotNull('application_deadline')
            ->whereDate('application_deadline', '>=', now()->toDateString());
    }

    /**
     * A vacancy is considered closed once its deadline has passed.
     */
    public function getIsExpiredAttribute(): bool
    {
        if (! $this->application_deadline) {
            return false;
        }

        return $this->application_deadline->isPast()
            && ! $this->application_deadline->isToday();
    }
}
