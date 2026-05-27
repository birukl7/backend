<?php

use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\ScreeningController;
use App\Services\AiMatchingService;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use App\Http\Controllers\CvController;
use App\Http\Controllers\InterviewController;
use App\Http\Controllers\VacancyController;


Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'employer'])->name('dashboard');
});


// ── Employer routes (role: employer) ─────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/employer/jobs',          [VacancyController::class, 'index'])->name('employer.jobs.index');
    Route::post('/employer/jobs',         [VacancyController::class, 'store'])->name('employer.jobs.store');
    Route::put('/employer/jobs/{vacancy}', [VacancyController::class, 'update'])->name('employer.jobs.update');
    Route::delete('/employer/jobs/{vacancy}', [VacancyController::class, 'destroy'])->name('employer.jobs.destroy');
});


// ── Job seeker routes (role: job_seeker) ─────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {

    // Browse all open jobs — pass CVs so the apply dialog can pick one
    Route::get('/jobs', function (AiMatchingService $aiService) {
        $vacancies = \App\Models\Vacancy::where('status', 'open')
            ->with('screening:id,vacancy_id,is_enabled')
            ->latest()
            ->get()
            ->map(function ($v) {
                $v->screening_required = (bool) optional($v->screening)->is_enabled;
                unset($v->screening);
                return $v;
            });

        // Build the simple vacancy array for the AI service
        $vacancyData = $vacancies->map(fn($v) => [
            'id'           => $v->id,
            'title'        => $v->title,
            'description'  => $v->description,
            'requirements' => $v->requirements,
        ])->toArray();

        // Get AI match scores (gracefully returns [] if service is down)
        $aiMatches = $aiService->matchForUser(auth()->id(), $vacancyData);

        return inertia('vacancy/index', [
            'vacancies'   => $vacancies,
            'applied_ids' => \App\Models\Application::where('user_id', auth()->id())
                                 ->pluck('vacancy_id'),
            'user_cvs'    => \App\Models\Cv::where('user_id', auth()->id())
                                 ->select('id', 'title', 'full_name', 'is_default')
                                 ->get(),
            'ai_matches'  => $aiMatches,  // Record<vacancy_id, score>
            'sidebar_stats' => [
                'applied'       => \App\Models\Application::where('user_id', auth()->id())->count(),
                'interviews'    => \App\Models\Interview::where('job_seeker_id', auth()->id())->count(),
                'skills_earned' => \App\Models\AssessmentResult::where('user_id', auth()->id())
                                       ->where('passed', true)
                                       ->distinct('assessment_id')
                                       ->count('assessment_id'),
                'cvs_count'     => \App\Models\Cv::where('user_id', auth()->id())->count(),
            ],
            'profile_completion' => (function () {
                $cv = \App\Models\Cv::where('user_id', auth()->id())
                    ->where('is_default', true)
                    ->with(['skills', 'experiences'])
                    ->first()
                    ?? \App\Models\Cv::where('user_id', auth()->id())
                        ->with(['skills', 'experiences'])
                        ->first();

                $score = 20; // base for account existence
                if ($cv) {
                    $score += 30;
                    if (!empty($cv->summary)) $score += 15;
                    if ($cv->skills->count() > 0) $score += 20;
                    if ($cv->experiences->count() > 0) $score += 15;
                }
                return $score;
            })(),
        ]);
    })->name('jobs.index');

// ── Job seeker ────────────────────────────────────────────────────────────
    Route::get('/my-applications',  [ApplicationController::class, 'index'])->name('applications.index');
    Route::post('/applications',    [ApplicationController::class, 'store'])->name('applications.store');
    Route::delete('/applications/{application}', [ApplicationController::class, 'destroy'])->name('applications.destroy');

    Route::get('/my-interviews',    [InterviewController::class, 'jobSeekerIndex'])->name('interviews.index');
    Route::delete('/interviews/{interview}', [InterviewController::class, 'destroy'])->name('interviews.destroy');
    Route::get('/interviews/{interview}/join', [InterviewController::class, 'join'])->name('interviews.join');

    // ── Employer ──────────────────────────────────────────────────────────────
    Route::prefix('employer')->name('employer.')->group(function () {

        // Applications management
        Route::get('/applications',  [ApplicationController::class, 'employerIndex'])->name('applications.index');
        Route::patch('/applications/{application}/status', [ApplicationController::class, 'updateStatus'])->name('applications.status');

        // Interview scheduling
        Route::get('/interviews',    [InterviewController::class, 'employerIndex'])->name('interviews.index');
        Route::post('/applications/{application}/interview', [InterviewController::class, 'store'])->name('interviews.store');
        Route::patch('/interviews/{interview}/reschedule',   [InterviewController::class, 'reschedule'])->name('interviews.reschedule');
        Route::patch('/interviews/{interview}/complete',     [InterviewController::class, 'complete'])->name('interviews.complete');
        Route::delete('/interviews/{interview}',             [InterviewController::class, 'destroy'])->name('interviews.destroy');
    });

    Route::get('/employer/jobs/{vacancy}/applications', [VacancyController::class, 'applications'])
    ->name('employer.jobs.applications');

    // ── Smart screening (AI-assisted) ─────────────────────────────────────
    // Employer-side: configure & tune screening
    Route::get('/employer/jobs/{vacancy}/screening',
        [VacancyController::class, 'showScreening'])->name('employer.jobs.screening.show');
    Route::put('/employer/jobs/{vacancy}/screening',
        [VacancyController::class, 'updateScreening'])->name('employer.jobs.screening.update');
    Route::post('/employer/jobs/{vacancy}/screening/tune',
        [VacancyController::class, 'tuneScreening'])->name('employer.jobs.screening.tune');

    // Employer-side: view a candidate's screening report
    Route::get('/employer/applications/{application}/screening',
        [ScreeningController::class, 'showForEmployer'])->name('employer.applications.screening');

    // Employer-side: AI-generated brief about the applicant's CV
    Route::get('/employer/applications/{application}/cv-summary',
        [ApplicationController::class, 'cvSummary'])->name('employer.applications.cv-summary');

    // Candidate-side: AI screening chat
    Route::post('/screening/{vacancy}/start',
        [ScreeningController::class, 'start'])->name('screening.start');
    Route::post('/screening/{response}/message',
        [ScreeningController::class, 'message'])->name('screening.message');
    Route::post('/screening/{response}/complete',
        [ScreeningController::class, 'complete'])->name('screening.complete');
});


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/cv',              [CvController::class, 'index'])->name('cv.index');
    Route::post('/cv',             [CvController::class, 'store'])->name('cv.store');
    Route::get('/cv/{id}',         [CvController::class, 'show'])->name('cv.show');
    Route::put('/cv/{id}',         [CvController::class, 'update'])->name('cv.update');
    Route::delete('/cv/{id}',      [CvController::class, 'destroy'])->name('cv.destroy');

    // Experiences
    Route::post('/cv/{cvId}/experiences',          [CvController::class, 'storeExperience'])->name('cv.experience.store');
    Route::put('/cv/{cvId}/experiences/{expId}',   [CvController::class, 'updateExperience'])->name('cv.experience.update');
    Route::delete('/cv/{cvId}/experiences/{expId}',[CvController::class, 'destroyExperience'])->name('cv.experience.destroy');

    // Education
    Route::post('/cv/{cvId}/education',            [CvController::class, 'storeEducation'])->name('cv.education.store');
    Route::put('/cv/{cvId}/education/{eduId}',     [CvController::class, 'updateEducation'])->name('cv.education.update');
    Route::delete('/cv/{cvId}/education/{eduId}',  [CvController::class, 'destroyEducation'])->name('cv.education.destroy');

    // Skills
    Route::post('/cv/{cvId}/skills',               [CvController::class, 'storeSkill'])->name('cv.skill.store');
    Route::put('/cv/{cvId}/skills/{skillId}',      [CvController::class, 'updateSkill'])->name('cv.skill.update');
    Route::delete('/cv/{cvId}/skills/{skillId}',   [CvController::class, 'destroySkill'])->name('cv.skill.destroy');

    // Projects
    Route::post('/cv/{cvId}/projects',             [CvController::class, 'storeProject'])->name('cv.project.store');
    Route::put('/cv/{cvId}/projects/{projectId}',  [CvController::class, 'updateProject'])->name('cv.project.update');
    Route::delete('/cv/{cvId}/projects/{projectId}',[CvController::class, 'destroyProject'])->name('cv.project.destroy');

    // Reorder
    Route::post('/cv/{cvId}/reorder',              [CvController::class, 'reorder'])->name('cv.reorder');

    // Photo upload
    Route::post('/cv/{id}/photo',                  [CvController::class, 'uploadPhoto'])->name('cv.photo');

    // AI summary (seeker)
    Route::post('/cv/{id}/ai-summary',             [CvController::class, 'aiSummary'])->name('cv.ai-summary');
    Route::post('/cv/{id}/use-ai-summary',         [CvController::class, 'useAiSummary'])->name('cv.use-ai-summary');
});


// ── Notifications ─────────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/notifications',                          [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/api/notifications',                      [NotificationController::class, 'apiIndex'])->name('notifications.api');
    Route::patch('/notifications/{notification}/read',    [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all',                [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::delete('/notifications/{notification}',        [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Vacancy preview — JSON endpoint for the notification drawer.
    // Lives here (not api.php) so the web session resolves auth()->user() correctly.
    Route::get('/api/vacancies/{vacancy}/preview', function (\App\Models\Vacancy $vacancy) {
        $userId = auth()->id();
        return response()->json([
            'vacancy'     => $vacancy,
            'has_applied' => \App\Models\Application::where('user_id', $userId)
                                 ->where('vacancy_id', $vacancy->id)
                                 ->exists(),
            'user_cvs'    => \App\Models\Cv::where('user_id', $userId)
                                 ->select('id', 'title', 'full_name', 'is_default')
                                 ->get(),
        ]);
    })->name('api.vacancy.preview');

    // AI suggestions + invite (employer only)
    Route::get('/employer/jobs/{vacancy}/ai-suggestions', [VacancyController::class, 'aiSuggestions'])->name('employer.jobs.ai-suggestions');
    Route::post('/employer/jobs/{vacancy}/invite/{userId}', [VacancyController::class, 'inviteUser'])->name('employer.jobs.invite');

    // Quiz / Assessments
    Route::get('/quiz',                        [QuizController::class, 'index'])->name('quiz.index');
    Route::post('/quiz/generate',               [QuizController::class, 'generate'])->name('quiz.generate');
    Route::get('/quiz/{assessment}',            [QuizController::class, 'show'])->name('quiz.show');
    Route::post('/quiz/{assessment}/submit',    [QuizController::class, 'submit'])->name('quiz.submit');
});

require __DIR__.'/settings.php';
