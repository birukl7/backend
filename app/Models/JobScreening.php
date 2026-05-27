<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobScreening extends Model
{
    protected $fillable = [
        'vacancy_id',
        'is_enabled',
        'intro_message',
        'criteria',
        'questions',
        'passing_score',
        'auto_reject_below',
    ];

    protected $casts = [
        'is_enabled'        => 'boolean',
        'criteria'          => 'array',
        'questions'         => 'array',
        'passing_score'     => 'integer',
        'auto_reject_below' => 'integer',
    ];

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(ScreeningResponse::class, 'vacancy_id', 'vacancy_id');
    }
}
