<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cv extends Model
{
    protected $fillable = [
        'user_id', 'title', 'is_default',
        'full_name', 'email', 'phone', 'location', 'website', 'linkedin', 'github', 'summary',
        'template', 'accent_color', 'section_order', 'photo_path',
        'ai_summary', 'ai_suggestions', 'ai_improvements', 'ai_strength_score', 'ai_summary_generated_at',
    ];

    protected $appends = ['photo_url'];

    protected $casts = [
        'is_default'              => 'boolean',
        'section_order'           => 'array',
        'ai_suggestions'          => 'array',
        'ai_improvements'         => 'array',
        'ai_strength_score'       => 'integer',
        'ai_summary_generated_at' => 'datetime',
    ];

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? asset('storage/' . $this->photo_path) : null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function experiences(): HasMany
    {
        return $this->hasMany(CvExperience::class)->orderBy('sort_order');
    }

    public function educations(): HasMany
    {
        return $this->hasMany(CvEducation::class)->orderBy('sort_order');
    }

    public function skills(): HasMany
    {
        return $this->hasMany(CvSkill::class)->orderBy('sort_order');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(CvProject::class)->orderBy('sort_order');
    }

    /** Bump updated_at so AI summary cache is considered stale. */
    public function markContentChanged(): void
    {
        $this->touch();
    }
}
