<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shortlist extends Model
{
    /** @use HasFactory<\Database\Factories\ShortlistFactory> */
    use HasFactory;

    protected $fillable = [
        'vacancy_id',
        'user_id',
    ];

    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(Vacancy::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
