<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentResult extends Model
{
    use HasFactory;

    protected $fillable = ['assessment_id', 'user_id', 'score', 'level', 'passed', 'time_taken_seconds', 'total_questions', 'correct_answers'];

    protected $casts = ['passed' => 'boolean'];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
