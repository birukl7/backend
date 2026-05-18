<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Assessment extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'description', 'skill_name', 'category', 'difficulty', 'time_limit_minutes', 'pass_score', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function questions()
    {
        return $this->hasMany(QuizQuestion::class)->orderBy('sort_order');
    }

    public function results()
    {
        return $this->hasMany(AssessmentResult::class);
    }
}
