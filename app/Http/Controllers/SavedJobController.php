<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\AssessmentResult;
use App\Models\Cv;
use App\Models\Interview;
use App\Models\Shortlist;
use App\Models\Vacancy;
use App\Services\AiMatchingService;
use App\Services\HiringStatsService;
use Inertia\Inertia;

class SavedJobController extends Controller
{
    /** GET /saved-jobs */
    public function index(AiMatchingService $aiService, HiringStatsService $hiringStats)
    {
        $userId = auth()->id();

        $vacancies = Vacancy::whereIn(
            'id',
            Shortlist::where('user_id', $userId)->pluck('vacancy_id')
        )
            ->with([
                'screening:id,vacancy_id,is_enabled',
                'employer:id,name,company_name,company_website,created_at,employer_type,employer_verification_status,company_verification_status',
            ])
            ->latest()
            ->get();

        $employerStats = $vacancies->pluck('user_id')->unique()->mapWithKeys(
            fn ($id) => [$id => $hiringStats->forEmployer($id)]
        );

        $vacancies = $vacancies->map(function ($v) use ($employerStats) {
            $v->screening_required = (bool) optional($v->screening)->is_enabled;
            unset($v->screening);
            $v->employer_stats = $employerStats[$v->user_id] ?? null;

            return $v;
        });

        $vacancyData = $vacancies->map(fn ($v) => [
            'id'           => $v->id,
            'title'        => $v->title,
            'description'  => $v->description,
            'requirements' => $v->requirements,
            'tags'         => $v->tags,
        ])->toArray();

        $aiMatches = $aiService->matchForUser($userId, $vacancyData);

        return Inertia::render('saved-jobs/index', [
            'vacancies'          => $vacancies,
            'saved_ids'          => $vacancies->pluck('id')->all(),
            'applied_ids'        => Application::where('user_id', $userId)->pluck('vacancy_id'),
            'user_cvs'           => Cv::where('user_id', $userId)
                ->select('id', 'title', 'full_name', 'is_default', 'source', 'original_filename')
                ->get(),
            'ai_matches'         => $aiMatches,
            'sidebar_stats'      => [
                'applied'       => Application::where('user_id', $userId)->count(),
                'interviews'    => Interview::where('job_seeker_id', $userId)->count(),
                'skills_earned' => AssessmentResult::where('user_id', $userId)
                    ->where('passed', true)
                    ->distinct('assessment_id')
                    ->count('assessment_id'),
                'cvs_count'     => Cv::where('user_id', $userId)->count(),
                'saved'         => Shortlist::where('user_id', $userId)->count(),
            ],
            'profile_completion' => $this->profileCompletion($userId),
            'is_authenticated'   => true,
        ]);
    }

    /** POST /saved-jobs/{vacancy} */
    public function store(Vacancy $vacancy)
    {
        Shortlist::firstOrCreate([
            'user_id'    => auth()->id(),
            'vacancy_id' => $vacancy->id,
        ]);

        return back()->with('success', 'Job saved.');
    }

    /** DELETE /saved-jobs/{vacancy} */
    public function destroy(Vacancy $vacancy)
    {
        Shortlist::where('user_id', auth()->id())
            ->where('vacancy_id', $vacancy->id)
            ->delete();

        return back()->with('success', 'Job removed from saved list.');
    }

    private function profileCompletion(int $userId): int
    {
        $cv = Cv::where('user_id', $userId)
            ->where('is_default', true)
            ->with(['skills', 'experiences'])
            ->first()
            ?? Cv::where('user_id', $userId)
                ->with(['skills', 'experiences'])
                ->first();

        $score = 20;
        if ($cv) {
            $score += 30;
            if (! empty($cv->summary)) {
                $score += 15;
            }
            if ($cv->skills->count() > 0) {
                $score += 20;
            }
            if ($cv->experiences->count() > 0) {
                $score += 15;
            }
        }

        return $score;
    }
}
