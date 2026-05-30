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
        'location',
        'salary_min',
        'salary_max',
        'employment_type',
        'status',
        'work_type',
        'application_deadline',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    public function screening()
    {
        return $this->hasOne(JobScreening::class);
    }

    public function screeningResponses()
    {
        return $this->hasMany(ScreeningResponse::class);
    }
}
