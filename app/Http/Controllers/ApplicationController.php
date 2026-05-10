<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Cv;
use App\Models\Vacancy;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ApplicationController extends Controller
{
    /** GET /applications  — job seeker: their applications */
    public function index()
    {
        $applications = Application::where('user_id', auth()->id())
            ->with(['vacancy', 'cv'])
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
        abort_if($vacancy->status !== 'open', 422, 'This job is no longer open.');
 
        $existing = Application::where('vacancy_id', $data['vacancy_id'])->where('user_id', $userId)->first();
        if ($existing) return back()->withErrors(['apply' => 'You have already applied.']);
 
        Application::create([
            'vacancy_id'   => $data['vacancy_id'],
            'cv_id'        => $cv->id,
            'user_id'      => $userId,
            'cover_letter' => $data['cover_letter'] ?? null,
            'status'       => 'pending',
        ]);
 
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
 
        $application->update(['status' => $request->status]);
 
        return back()->with('success', 'Application status updated.');
    }
}