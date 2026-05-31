<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Cv;
use App\Models\ScreeningResponse;
use App\Models\User;
use App\Models\Vacancy;
use App\Notifications\ApplicationStatusNotification;
use App\Services\AiCvSummaryService;
use App\Services\UserNotifier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ApplicationController extends Controller
{
    /** GET /applications  — job seeker: their applications */
    public function index()
    {
        $applications = Application::where('user_id', auth()->id())
            ->with(['vacancy', 'cv', 'hireReviews.reviewer:id,name'])
            ->latest()
            ->get();
 
        return Inertia::render('applications/index', [
            'applications' => $applications,
        ]);
    }
 
    /** POST /applications */
    public function store(Request $request)
    {
        $data = $request->validate([
            'vacancy_id'   => 'required|exists:vacancies,id',
            'cv_id'        => 'required|exists:cvs,id',
            'cover_letter' => 'nullable|string|max:5000',
        ]);
 
        $userId = auth()->id();
        $cv = Cv::where('id', $data['cv_id'])->where('user_id', $userId)->firstOrFail();
 
        $vacancy = \App\Models\Vacancy::findOrFail($data['vacancy_id']);
        abort_if($vacancy->is_expired, 422, 'The application deadline for this job has passed.');
 
        $existing = Application::where('vacancy_id', $data['vacancy_id'])->where('user_id', $userId)->first();
        if ($existing) return back()->withErrors(['apply' => 'You have already applied.']);
 
        $screening = $vacancy->screening;
        if ($screening && $screening->is_enabled) {
            $screeningResponse = ScreeningResponse::where('vacancy_id', $vacancy->id)
                ->where('user_id', $userId)
                ->where('status', 'completed')
                ->latest()
                ->first();

            if (!$screeningResponse) {
                return back()->withErrors(['screening' => 'Please complete the AI screening before applying.']);
            }
        }

        $initialStatus = 'pending';
        if (isset($screeningResponse, $screening)) {
            if ($screening->auto_reject_below !== null && $screeningResponse->ai_score < $screening->auto_reject_below) {
                $initialStatus = 'rejected';
            } elseif ($screeningResponse->ai_score >= ($screening->passing_score ?? 60)) {
                $initialStatus = 'shortlisted';
            }
        }

        $application = Application::create([
            'vacancy_id'   => $data['vacancy_id'],
            'cv_id'        => $cv->id,
            'user_id'      => $userId,
            'cover_letter' => $data['cover_letter'] ?? null,
            'status'       => $initialStatus,
        ]);

        if (isset($screeningResponse)) {
            $screeningResponse->update(['application_id' => $application->id]);
        }

        return back()->with('success', 'Application submitted!');
    }
 
    /** DELETE /applications/{application} — withdraw */
    public function destroy(Application $application)
    {
        abort_if($application->user_id !== auth()->id(), 403);
        abort_if(in_array($application->status, ['shortlisted', 'hired']), 422, 'Cannot withdraw at this stage.');
        $application->delete();
        return back()->with('success', 'Application withdrawn.');
    }
 
    // ── Employer actions ──────────────────────────────────────────────────────
 
    /**
     * GET /employer/applications
     * List all applications for jobs this employer owns.
     */
    public function employerIndex()
    {
        $applications = Application::whereHas('vacancy', fn($q) => $q->where('user_id', auth()->id()))
            ->with([
                'vacancy:id,title,location,work_type,employment_type',
                'user:id,name,email',
                'cv:id,title,full_name,email,phone,location,summary',
                'cv.experiences',
                'cv.educations',
                'cv.skills',
                'cv.projects',
                'interview',
                'screeningResponse',
                'hireReviews.reviewer:id,name',
            ])
            ->latest()
            ->get();
 
        return Inertia::render('employer/applications/index', [
            'applications' => $applications,
        ]);
    }
 
    /**
     * PATCH /employer/applications/{application}/status
     * Accept or reject an application.
     */
    public function updateStatus(Request $request, Application $application)
    {
        abort_if($application->vacancy->user_id !== auth()->id(), 403);
 
        $request->validate([
            'status' => 'required|in:shortlisted,rejected,hired',
        ]);
 
        $status = $request->status;
        $application->update(['status' => $status]);
        $application->load(['vacancy', 'user']);

        $jobTitle = $application->vacancy?->title ?? 'the position';
        [$title, $body] = match ($status) {
            'shortlisted' => [
                'You have been shortlisted',
                "Your application for \"{$jobTitle}\" has been shortlisted.",
            ],
            'hired' => [
                'Congratulations — you have been hired',
                "You have been selected for \"{$jobTitle}\". The employer will be in touch with next steps.",
            ],
            'rejected' => [
                'Application update',
                "Your application for \"{$jobTitle}\" was not selected at this time.",
            ],
            default => [
                'Application status updated',
                "Your application status for \"{$jobTitle}\" is now: {$status}.",
            ],
        };

        UserNotifier::notify(
            User::find($application->user_id),
            new ApplicationStatusNotification($application, $status),
            [
                'type'  => 'application_status',
                'title' => $title,
                'body'  => $body,
                'data'  => [
                    'application_id' => $application->id,
                    'vacancy_id'     => $application->vacancy_id,
                    'status'         => $status,
                ],
            ],
        );

        return back()->with('success', 'Application status updated.');
    }

    /**
     * GET /employer/applications/{application}/cv-summary
     * Generate (and cache) an employer-facing AI brief about the applicant's CV.
     */
    public function cvSummary(Application $application, AiCvSummaryService $ai)
    {
        abort_if($application->vacancy->user_id !== auth()->id(), 403);

        $application->loadMissing([
            'cv.experiences', 'cv.educations', 'cv.skills', 'cv.projects',
            'vacancy:id,title,description,requirements',
        ]);

        $jobContext = sprintf(
            "Title: %s\nDescription: %s\nRequirements: %s",
            $application->vacancy->title,
            $application->vacancy->description,
            $application->vacancy->requirements ?? '—'
        );

        $brief = $ai->generateForEmployer($application->cv, $jobContext);

        return response()->json([
            'configured' => $ai->isConfigured(),
            'brief'      => $brief,
        ]);
    }
}