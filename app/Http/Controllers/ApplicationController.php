<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Cv;
use App\Models\Vacancy;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * Submit a job application.
     * Called via POST /applications
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'vacancy_id'   => 'required|exists:vacancies,id',
            'cv_id'        => 'required|exists:cvs,id',
            'cover_letter' => 'nullable|string|max:5000',
        ]);

        $userId = auth()->id();

        // Verify the CV belongs to the authenticated user
        $cv = Cv::where('id', $data['cv_id'])
            ->where('user_id', $userId)
            ->firstOrFail();

        // Verify the vacancy is open
        $vacancy = Vacancy::findOrFail($data['vacancy_id']);
        abort_if($vacancy->status !== 'open', 422, 'This job is no longer accepting applications.');

        // Check for duplicate application
        $existing = Application::where('vacancy_id', $data['vacancy_id'])
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            return back()->withErrors(['apply' => 'You have already applied to this job.']);
        }

        Application::create([
            'vacancy_id'   => $data['vacancy_id'],
            'cv_id'        => $cv->id,
            'user_id'      => $userId,
            'cover_letter' => $data['cover_letter'] ?? null,
            'status'       => 'pending',
        ]);

        return back()->with('success', 'Application submitted successfully!');
    }

    /**
     * List the authenticated user's applications.
     * Called via GET /my-applications
     */
    public function index()
    {
        $applications = Application::where('user_id', auth()->id())
            ->with(['vacancy', 'cv'])
            ->latest()
            ->get();

        return inertia('applications/index', [
            'applications' => $applications,
        ]);
    }

    /**
     * Withdraw an application.
     * Called via DELETE /applications/{application}
     */
    public function destroy(Application $application)
    {
        abort_if($application->user_id !== auth()->id(), 403);
        abort_if(
            in_array($application->status, ['shortlisted', 'hired']),
            422,
            'You cannot withdraw this application.'
        );

        $application->delete();

        return back()->with('success', 'Application withdrawn.');
    }
}