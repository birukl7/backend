<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuizQuestion extends Model
{
    protected $fillable = ['assessment_id', 'question', 'explanation', 'sort_order'];

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    public function options()
    {
        return $this->hasMany(QuizOption::class, 'question_id')->orderBy('sort_order');
    }
}
