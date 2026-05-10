<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Interview;
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
            'interviews' => $interviews,
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
        $user = auth()->id();
        abort_if($interview->employer_id !== $user && $interview->job_seeker_id !== $user, 403);
        $interview->update(['status' => 'cancelled']);
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
            'interviews' => $interviews,
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
