<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Interview;
use App\Models\User;
use App\Notifications\InterviewCancelledNotification;
use App\Notifications\InterviewRescheduledNotification;
use App\Notifications\InterviewScheduledNotification;
use App\Services\GoogleCalendarService;
use App\Services\UserNotifier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InterviewController extends Controller
{
    /**
     * GET /employer/interviews
     * All interviews for this employer's vacancies.
     */
    public function employerIndex()
    {
        $interviews = Interview::where('employer_id', auth()->id())
            ->with(['application.vacancy:id,title,location', 'jobSeeker:id,name,email'])
            ->latest('scheduled_at')
            ->get()
            ->map(fn($i) => $this->formatInterview($i));
 
        return Inertia::render('employer/interviews/index', [
            'interviews'               => $interviews,
            'google_calendar_connected' => (bool) auth()->user()->google_calendar_connected,
        ]);
    }
 
    /**
     * POST /employer/applications/{application}/interview
     * Schedule a new interview from an application.
     */
    public function store(Request $request, Application $application)
    {
        abort_if($application->vacancy->user_id !== auth()->id(), 403);
 
        $data = $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'notes'        => 'nullable|string|max:1000',
            'timezone'     => 'nullable|string|max:60',
        ]);
 
        // Prevent duplicate scheduling
        if ($application->interview) {
            return back()->withErrors(['interview' => 'Interview already scheduled. Use reschedule instead.']);
        }
 
        $roomId = 'interview-' . \Str::random(12);
        $meetingLink = 'https://meet.jit.si/' . $roomId;
 
        $interview = Interview::create([
            'application_id' => $application->id,
            'job_seeker_id'  => $application->user_id,
            'employer_id'    => auth()->id(),
            'scheduled_at'   => $data['scheduled_at'],
            'room_id'        => $roomId,
            'meeting_link'   => $meetingLink,
            'notes'          => $data['notes'] ?? null,
            'timezone'       => $data['timezone'] ?? 'UTC',
            'status'         => 'scheduled',
        ]);
 
        // Update application status to shortlisted automatically
        $application->update(['status' => 'shortlisted']);

        $interview->load(['application.vacancy', 'employer']);
        $jobSeeker = User::find($application->user_id);
        $vacancyTitle = $application->vacancy?->title ?? 'a position';
        $when = $interview->scheduled_at?->format('M j, Y g:i A');

        UserNotifier::notify(
            $jobSeeker,
            new InterviewScheduledNotification($interview),
            [
                'type'  => 'interview_scheduled',
                'title' => 'Interview invitation',
                'body'  => "You are invited to interview for \"{$vacancyTitle}\" on {$when}.",
                'data'  => [
                    'interview_id' => $interview->id,
                    'vacancy_id'   => $application->vacancy_id,
                ],
            ],
        );

        $this->syncCalendarCreate($interview, $vacancyTitle);

        return back()->with('success', 'Interview scheduled successfully!');
    }
 
    /**
     * PATCH /employer/interviews/{interview}/reschedule
     */
    public function reschedule(Request $request, Interview $interview)
    {
        abort_if($interview->employer_id !== auth()->id(), 403);
 
        $data = $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'notes'        => 'nullable|string|max:1000',
            'timezone'     => 'nullable|string|max:60',
        ]);
 
        $interview->update([
            'rescheduled_at' => $interview->scheduled_at, // save old time
            'scheduled_at'   => $data['scheduled_at'],
            'notes'          => $data['notes'] ?? $interview->notes,
            'timezone'       => $data['timezone'] ?? $interview->timezone,
            'status'         => 'scheduled',
        ]);

        $interview->load(['application.vacancy', 'employer']);
        $jobSeeker = User::find($interview->job_seeker_id);
        $vacancyTitle = $interview->application?->vacancy?->title ?? 'a position';
        $when = $interview->scheduled_at?->format('M j, Y g:i A');

        UserNotifier::notify(
            $jobSeeker,
            new InterviewRescheduledNotification($interview),
            [
                'type'  => 'interview_rescheduled',
                'title' => 'Interview rescheduled',
                'body'  => "Your interview for \"{$vacancyTitle}\" has been moved to {$when}.",
                'data'  => [
                    'interview_id' => $interview->id,
                    'vacancy_id'   => $interview->application?->vacancy_id,
                ],
            ],
        );

        $this->syncCalendarUpdate($interview, $vacancyTitle);

        return back()->with('success', 'Interview rescheduled.');
    }
 
    /**
     * PATCH /employer/interviews/{interview}/complete
     */
    public function complete(Interview $interview)
    {
        abort_if($interview->employer_id !== auth()->id(), 403);
        $interview->update(['status' => 'completed']);
        return back()->with('success', 'Interview marked as completed.');
    }
 
    /**
     * DELETE /interviews/{interview}   — either party can cancel
     */
    public function destroy(Interview $interview)
    {
        $userId = auth()->id();
        abort_if($interview->employer_id !== $userId && $interview->job_seeker_id !== $userId, 403);

        $interview->update(['status' => 'cancelled']);
        $interview->load(['application.vacancy']);

        $vacancyTitle = $interview->application?->vacancy?->title ?? 'a position';
        $recipientId = $userId === $interview->employer_id
            ? $interview->job_seeker_id
            : $interview->employer_id;
        $recipient = User::find($recipientId);

        UserNotifier::notify(
            $recipient,
            new InterviewCancelledNotification($interview),
            [
                'type'  => 'interview_cancelled',
                'title' => 'Interview cancelled',
                'body'  => "The interview for \"{$vacancyTitle}\" has been cancelled.",
                'data'  => [
                    'interview_id' => $interview->id,
                    'vacancy_id'   => $interview->application?->vacancy_id,
                ],
            ],
        );

        $this->syncCalendarDelete($interview);

        return back()->with('success', 'Interview cancelled.');
    }
 
    /**
     * GET /my-interviews  — job seeker view
     */
    public function jobSeekerIndex()
    {
        $interviews = Interview::where('job_seeker_id', auth()->id())
            ->with(['application.vacancy:id,title,location', 'employer:id,name,email'])
            ->latest('scheduled_at')
            ->get()
            ->map(fn($i) => $this->formatInterview($i, forJobSeeker: true));
 
        return Inertia::render('interviews/index', [
            'interviews'               => $interviews,
            'google_calendar_connected' => (bool) auth()->user()->google_calendar_connected,
        ]);
    }
 
    /**
     * GET /interviews/{interview}/join  — Jitsi room page
     */
    public function join(Interview $interview)
    {
        $user = auth()->id();
        abort_if($interview->employer_id !== $user && $interview->job_seeker_id !== $user, 403);
 
        return Inertia::render('interviews/room', [
            'interview'    => $this->formatInterview($interview),
            'display_name' => auth()->user()->name,
            'room_id'      => $interview->room_id,
        ]);
    }
 
    // ── Google Calendar sync ──────────────────────────────────────────────────

    private function syncCalendarCreate(Interview $interview, string $vacancyTitle): void
    {
        try {
            $cal = app(GoogleCalendarService::class);
            $updates = [];

            $seeker = User::find($interview->job_seeker_id);
            if ($seeker?->google_calendar_refresh_token) {
                $eventId = $cal->createEvent($seeker, $interview, "Interview: {$vacancyTitle}");
                if ($eventId) $updates['seeker_calendar_event_id'] = $eventId;
            }

            $employer = User::find($interview->employer_id);
            if ($employer?->google_calendar_refresh_token) {
                $eventId = $cal->createEvent($employer, $interview, "Interview with candidate — {$vacancyTitle}");
                if ($eventId) $updates['employer_calendar_event_id'] = $eventId;
            }

            if ($updates) {
                $interview->updateQuietly($updates);
            }
        } catch (\Throwable $e) {
            \Log::error('Calendar create sync failed', ['interview_id' => $interview->id, 'error' => $e->getMessage()]);
        }
    }

    private function syncCalendarUpdate(Interview $interview, string $vacancyTitle): void
    {
        try {
            $cal = app(GoogleCalendarService::class);

            $seeker = User::find($interview->job_seeker_id);
            if ($seeker?->google_calendar_refresh_token) {
                if ($interview->seeker_calendar_event_id) {
                    $cal->updateEvent($seeker, $interview, $interview->seeker_calendar_event_id, "Interview: {$vacancyTitle}");
                } else {
                    $eventId = $cal->createEvent($seeker, $interview, "Interview: {$vacancyTitle}");
                    if ($eventId) $interview->updateQuietly(['seeker_calendar_event_id' => $eventId]);
                }
            }

            $employer = User::find($interview->employer_id);
            if ($employer?->google_calendar_refresh_token) {
                if ($interview->employer_calendar_event_id) {
                    $cal->updateEvent($employer, $interview, $interview->employer_calendar_event_id, "Interview with candidate — {$vacancyTitle}");
                } else {
                    $eventId = $cal->createEvent($employer, $interview, "Interview with candidate — {$vacancyTitle}");
                    if ($eventId) $interview->updateQuietly(['employer_calendar_event_id' => $eventId]);
                }
            }
        } catch (\Throwable $e) {
            \Log::error('Calendar update sync failed', ['interview_id' => $interview->id, 'error' => $e->getMessage()]);
        }
    }

    private function syncCalendarDelete(Interview $interview): void
    {
        try {
            $cal = app(GoogleCalendarService::class);

            $seeker = User::find($interview->job_seeker_id);
            if ($seeker && $interview->seeker_calendar_event_id) {
                $cal->deleteEvent($seeker, $interview->seeker_calendar_event_id);
            }

            $employer = User::find($interview->employer_id);
            if ($employer && $interview->employer_calendar_event_id) {
                $cal->deleteEvent($employer, $interview->employer_calendar_event_id);
            }
        } catch (\Throwable $e) {
            \Log::error('Calendar delete sync failed', ['interview_id' => $interview->id, 'error' => $e->getMessage()]);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatInterview(Interview $i, bool $forJobSeeker = false): array
    {
        $vacancy = $i->application?->vacancy;
        return [
            'id'               => $i->id,
            'scheduled_at'     => $i->scheduled_at?->toIso8601String(),
            'rescheduled_at'   => $i->rescheduled_at?->toIso8601String(),
            'status'           => $i->status,
            'notes'            => $i->notes,
            'timezone'         => $i->timezone,
            'room_id'          => $i->room_id,
            'meeting_link'     => $i->meeting_link,
            'vacancy_title'    => $vacancy?->title ?? 'Unknown',
            'vacancy_location' => $vacancy?->location,
            'application_id'   => $i->application_id,
            'employer_name'    => $forJobSeeker ? ($i->employer?->name ?? 'Employer') : null,
            'candidate_name'   => !$forJobSeeker ? ($i->jobSeeker?->name ?? 'Candidate') : null,
            'candidate_email'  => !$forJobSeeker ? ($i->jobSeeker?->email) : null,
        ];
    }
}
