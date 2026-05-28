<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScreeningResponse extends Model
{
    protected $fillable = [
        'vacancy_id',
        'user_id',
        'application_id',
        'transcript',
        'answers',
        'ai_score',
        'ai_summary',
        'ai_strengths',
        'ai_concerns',
        'recommendation',
        'status',
        'completed_at',
    ];

    protected $casts = [
        'transcript'    => 'array',
        'answers'       => 'array',
        'ai_strengths'  => 'array',
        'ai_concerns'   => 'array',
        'completed_at'  => 'datetime',
        'ai_score'      => 'integer',
    ];

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }
}
