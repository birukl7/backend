<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Vacancy;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function employer()
    {
        // Redirect job seekers to /jobs using Spatie's role check
        if (Auth::user()?->hasRole('job_seeker')) {
            return redirect('/jobs');
        }

        $userId = Auth::id();

        // All employer's vacancies with application counts
        $vacancies = Vacancy::where('user_id', $userId)
            ->withCount('applications')
            ->latest()
            ->get();

        $totalJobs         = $vacancies->count();
        // Availability is now driven by the application deadline rather than a
        // manual open/closed toggle: a job is "open" until its deadline passes.
        $openJobs          = $vacancies->where('is_expired', false)->count();
        $closedJobs        = $vacancies->where('is_expired', true)->count();
        $totalApplications = $vacancies->sum('applications_count');
        $totalHires        = Application::whereHas(
                'vacancy',
                fn ($q) => $q->where('user_id', $userId)
            )
            ->where('status', 'hired')
            ->count();

        // Applications by status breakdown
        $statusBreakdown = Application::whereHas(
                'vacancy',
                fn ($q) => $q->where('user_id', $userId)
            )
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])
            ->values();

        // Top 6 jobs by application count
        $applicationsPerJob = $vacancies
            ->sortByDesc('applications_count')
            ->take(6)
            ->map(fn ($v) => [
                'title' => strlen($v->title) > 28 ? substr($v->title, 0, 28) . '…' : $v->title,
                'count' => $v->applications_count,
            ])
            ->values();

        // Daily applications over last 30 days
        $raw = Application::whereHas(
                'vacancy',
                fn ($q) => $q->where('user_id', $userId)
            )
            ->where('created_at', '>=', now()->subDays(29)->startOfDay())
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $applicationsOverTime = collect();
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $applicationsOverTime->push([
                'date'  => now()->subDays($i)->format('M d'),
                'count' => (int) ($raw[$date]->count ?? 0),
            ]);
        }

        // Work type distribution of open jobs
        $workTypeBreakdown = $vacancies
            ->where('status', 'open')
            ->groupBy('work_type')
            ->map(fn ($group, $key) => ['type' => $key, 'count' => $group->count()])
            ->values();

        return inertia('employer/dashboard', [
            'stats' => [
                'totalJobs'         => $totalJobs,
                'openJobs'          => $openJobs,
                'closedJobs'        => $closedJobs,
                'totalApplications' => $totalApplications,
                'totalHires'        => $totalHires,
            ],
            'statusBreakdown'     => $statusBreakdown,
            'applicationsPerJob'  => $applicationsPerJob,
            'applicationsOverTime' => $applicationsOverTime->values(),
            'workTypeBreakdown'   => $workTypeBreakdown,
        ]);
    }
}
