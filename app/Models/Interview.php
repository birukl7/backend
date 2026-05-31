<?php
// ─── app/Models/Interview.php ─────────────────────────────────────────────────

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Interview extends Model
{
    protected $fillable = [
        'application_id',
        'job_seeker_id',
        'employer_id',
        'scheduled_at',
        'rescheduled_at',
        'room_id',
        'meeting_link',
        'notes',
        'timezone',
        'status',
        'seeker_calendar_event_id',
        'employer_calendar_event_id',
    ];

    protected $casts = [
        'scheduled_at'    => 'datetime',
        'rescheduled_at'  => 'datetime',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function jobSeeker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'job_seeker_id');
    }

    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }
}