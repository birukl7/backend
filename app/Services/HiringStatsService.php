<?php

namespace App\Services;

use App\Models\Application;
use App\Models\User;
use App\Models\Vacancy;
use Illuminate\Support\Facades\DB;

/**
 * Computes hiring statistics:
 *   - the number of hires (per employer and platform-wide),
 *   - public hiring statistics for the marketing/landing page,
 *   - an employer's hiring history (used to build trust on the job drawer).
 *
 * A "hire" is an Application whose status has reached `hired`.
 */
class HiringStatsService
{
    /**
     * Lightweight hiring summary for a single employer.
     * Safe to expose publicly — contains aggregate numbers only.
     *
     * @return array<string, mixed>
     */
    public function forEmployer(int $employerId): array
    {
        $vacancyIds = Vacancy::where('user_id', $employerId)->pluck('id');

        $totalJobs = $vacancyIds->count();

        $totalApplications = Application::whereIn('vacancy_id', $vacancyIds)->count();

        $totalHires = Application::whereIn('vacancy_id', $vacancyIds)
            ->where('status', 'hired')
            ->count();

        $hiresLast30Days = Application::whereIn('vacancy_id', $vacancyIds)
            ->where('status', 'hired')
            ->where('updated_at', '>=', now()->subDays(30))
            ->count();

        $employer = User::find($employerId);

        return [
            'employer_id'        => $employerId,
            'employer_name'      => $employer?->company_name ?: $employer?->name,
            'total_jobs'         => $totalJobs,
            'total_applications' => $totalApplications,
            'total_hires'        => $totalHires,
            'hires_last_30_days' => $hiresLast30Days,
            'hire_rate'          => $totalApplications > 0
                ? round(($totalHires / $totalApplications) * 100)
                : 0,
            'member_since'       => $employer?->created_at?->toDateString(),
        ];
    }

    /**
     * Recent hires made by an employer (no personally identifying details
     * beyond first name + job title, suitable for the public job drawer).
     *
     * @return array<int, array<string, mixed>>
     */
    public function recentHiresForEmployer(int $employerId, int $limit = 5): array
    {
        return Application::where('status', 'hired')
            ->whereHas('vacancy', fn ($q) => $q->where('user_id', $employerId))
            ->with(['vacancy:id,title', 'user:id,name'])
            ->latest('updated_at')
            ->limit($limit)
            ->get()
            ->map(function (Application $a) {
                $name = $a->user?->name ?? 'A candidate';
                $first = explode(' ', trim($name))[0] ?? $name;

                return [
                    'job_title' => $a->vacancy?->title,
                    'candidate' => $first,
                    'hired_at'  => $a->updated_at?->toDateString(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Platform-wide public hiring statistics.
     *
     * @return array<string, mixed>
     */
    public function publicStats(): array
    {
        $totalHires = Application::where('status', 'hired')->count();

        $totalApplications = Application::count();

        $employersHiring = Application::where('status', 'hired')
            ->whereHas('vacancy')
            ->with('vacancy:id,user_id')
            ->get()
            ->pluck('vacancy.user_id')
            ->unique()
            ->count();

        $hiresLast30Days = Application::where('status', 'hired')
            ->where('updated_at', '>=', now()->subDays(30))
            ->count();

        return [
            'total_hires'        => $totalHires,
            'total_applications' => $totalApplications,
            'active_jobs'        => Vacancy::active()->count(),
            'employers_hiring'   => $employersHiring,
            'hires_last_30_days' => $hiresLast30Days,
            'success_rate'       => $totalApplications > 0
                ? round(($totalHires / $totalApplications) * 100)
                : 0,
        ];
    }

    /**
     * Top employers ranked by number of hires (public leaderboard).
     *
     * @return array<int, array<string, mixed>>
     */
    public function topHiringEmployers(int $limit = 8): array
    {
        $rows = Application::where('applications.status', 'hired')
            ->join('vacancies', 'applications.vacancy_id', '=', 'vacancies.id')
            ->join('users', 'vacancies.user_id', '=', 'users.id')
            ->select(
                'users.id as employer_id',
                DB::raw("COALESCE(NULLIF(users.company_name, ''), users.name) as employer_name"),
                DB::raw('count(*) as hires')
            )
            ->groupBy('users.id', 'employer_name')
            ->orderByDesc('hires')
            ->limit($limit)
            ->get();

        return $rows->map(fn ($r) => [
            'employer_id'   => (int) $r->employer_id,
            'employer_name' => $r->employer_name,
            'hires'         => (int) $r->hires,
        ])->all();
    }

    /**
     * Monthly hires over the last 6 months for a public trend chart.
     *
     * @return array<int, array<string, mixed>>
     */
    public function hiresOverTime(int $months = 6): array
    {
        $raw = Application::where('status', 'hired')
            ->where('updated_at', '>=', now()->subMonths($months - 1)->startOfMonth())
            ->get()
            ->groupBy(fn ($a) => $a->updated_at?->format('Y-m'));

        $series = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            // Anchor to the first of the month to avoid Carbon's short-month
            // overflow (e.g. subtracting a month from May 31 → Mar 3).
            $month = now()->startOfMonth()->subMonthsNoOverflow($i);
            $key = $month->format('Y-m');
            $series[] = [
                'month' => $month->format('M'),
                'hires' => isset($raw[$key]) ? $raw[$key]->count() : 0,
            ];
        }

        return $series;
    }
}
