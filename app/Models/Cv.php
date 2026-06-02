<?php

namespace App\Models;

use App\Support\PublicUploads;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cv extends Model
{
    protected $fillable = [
        'user_id', 'title', 'is_default', 'source',
        'file_path', 'original_filename', 'mime_type', 'extracted_text', 'extracted_at',
        'full_name', 'email', 'phone', 'location', 'website', 'linkedin', 'github', 'summary',
        'template', 'accent_color', 'section_order', 'photo_path',
        'ai_summary', 'ai_suggestions', 'ai_improvements', 'ai_strength_score', 'ai_summary_generated_at',
        'summary_approval_status', 'summary_moderation_notes', 'summary_moderated_at', 'summary_moderated_by',
    ];

    protected $appends = ['photo_url', 'file_url'];

    protected $casts = [
        'is_default' => 'boolean',
        'section_order' => 'array',
        'ai_suggestions' => 'array',
        'ai_improvements' => 'array',
        'ai_strength_score' => 'integer',
        'ai_summary_generated_at' => 'datetime',
        'extracted_at' => 'datetime',
        'summary_moderated_at' => 'datetime',
    ];

    public function getPhotoUrlAttribute(): ?string
    {
        return PublicUploads::url($this->photo_path);
    }

    public function getFileUrlAttribute(): ?string
    {
        return PublicUploads::url($this->file_path);
    }

    public function isUpload(): bool
    {
        return $this->source === 'upload';
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
