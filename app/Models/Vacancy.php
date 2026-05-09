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
}
