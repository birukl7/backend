<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\HireReviewController;
use App\Http\Controllers\HiringStatsController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\SavedJobController;
use App\Http\Controllers\ScreeningController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use App\Http\Controllers\CvController;
use App\Http\Controllers\InterviewController;
use App\Http\Controllers\VacancyController;


Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

// ── Public ───────────────────────────────────────────────────────────────────
// The job board and hiring statistics are open to everyone. Guests can browse
// but are redirected to login when they try to apply (handled client-side).
Route::get('/jobs', [VacancyController::class, 'browse'])->name('jobs.index');
Route::get('/hiring-statistics', [HiringStatsController::class, 'index'])->name('hiring-statistics');

Route::middleware('guest')->group(function () {
    Route::get('auth/google', [GoogleAuthController::class, 'redirect'])->name('auth.google');
    Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});

// Google Calendar integration (authenticated users only)
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('auth/google/calendar', [GoogleCalendarController::class, 'connect'])->name('google.calendar.connect');
    Route::get('auth/google/calendar/callback', [GoogleCalendarController::class, 'callback'])->name('google.calendar.callback');
    Route::post('auth/google/calendar/disconnect', [GoogleCalendarController::class, 'disconnect'])->name('google.calendar.disconnect');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'employer'])->name('dashboard');
});

// Employer routes
Route::middleware(['auth', 'verified', 'role:employer'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'employer'])->name('dashboard');

    Route::get('/employer/jobs',          [VacancyController::class, 'index'])->name('employer.jobs.index');
    Route::post('/employer/jobs',         [VacancyController::class, 'store'])->name('employer.jobs.store');
    Route::put('/employer/jobs/{vacancy}', [VacancyController::class, 'update'])->name('employer.jobs.update');
    Route::delete('/employer/jobs/{vacancy}', [VacancyController::class, 'destroy'])->name('employer.jobs.destroy');

    Route::get('/employer/jobs/{vacancy}/applications', [VacancyController::class, 'applications'])
        ->name('employer.jobs.applications');

    Route::get('/employer/jobs/{vacancy}/screening',
        [VacancyController::class, 'showScreening'])->name('employer.jobs.screening.show');
    Route::put('/employer/jobs/{vacancy}/screening',
        [VacancyController::class, 'updateScreening'])->name('employer.jobs.screening.update');
    Route::post('/employer/jobs/{vacancy}/screening/tune',
        [VacancyController::class, 'tuneScreening'])->name('employer.jobs.screening.tune');

    Route::get('/employer/applications/{application}/screening',
        [ScreeningController::class, 'showForEmployer'])->name('employer.applications.screening');

    Route::get('/employer/applications/{application}/cv-summary',
        [ApplicationController::class, 'cvSummary'])->name('employer.applications.cv-summary');

    Route::get('/employer/jobs/{vacancy}/ai-suggestions', [VacancyController::class, 'aiSuggestions'])->name('employer.jobs.ai-suggestions');
    Route::post('/employer/jobs/{vacancy}/invite/{userId}', [VacancyController::class, 'inviteUser'])->name('employer.jobs.invite');

// ── Job seeker ────────────────────────────────────────────────────────────
    Route::get('/my-applications',  [ApplicationController::class, 'index'])->name('applications.index');
    Route::get('/saved-jobs',       [SavedJobController::class, 'index'])->name('saved-jobs.index');
    Route::post('/saved-jobs/{vacancy}', [SavedJobController::class, 'store'])->name('saved-jobs.store');
    Route::delete('/saved-jobs/{vacancy}', [SavedJobController::class, 'destroy'])->name('saved-jobs.destroy');
    Route::post('/applications',    [ApplicationController::class, 'store'])->name('applications.store');
    Route::delete('/applications/{application}', [ApplicationController::class, 'destroy'])->name('applications.destroy');
    Route::post('/applications/{application}/review', [HireReviewController::class, 'store'])->name('applications.review');

    Route::get('/my-interviews',    [InterviewController::class, 'jobSeekerIndex'])->name('interviews.index');
    Route::delete('/interviews/{interview}', [InterviewController::class, 'destroy'])->name('interviews.destroy');
    Route::get('/interviews/{interview}/join', [InterviewController::class, 'join'])->name('interviews.join');

    Route::post('/screening/{vacancy}/start',
        [ScreeningController::class, 'start'])->name('screening.start');
    Route::post('/screening/{response}/message',
        [ScreeningController::class, 'message'])->name('screening.message');
    Route::post('/screening/{response}/complete',
        [ScreeningController::class, 'complete'])->name('screening.complete');

    Route::get('/cv',              [CvController::class, 'index'])->name('cv.index');
    Route::post('/cv',             [CvController::class, 'store'])->name('cv.store');
    Route::post('/cv/upload',      [CvController::class, 'upload'])->name('cv.upload');
    Route::get('/cv/{id}',         [CvController::class, 'show'])->name('cv.show');
    Route::get('/cv/{id}/download', [CvController::class, 'download'])->name('cv.download');
    Route::put('/cv/{id}',         [CvController::class, 'update'])->name('cv.update');
    Route::delete('/cv/{id}',      [CvController::class, 'destroy'])->name('cv.destroy');

    Route::post('/cv/{cvId}/experiences',          [CvController::class, 'storeExperience'])->name('cv.experience.store');
    Route::put('/cv/{cvId}/experiences/{expId}',   [CvController::class, 'updateExperience'])->name('cv.experience.update');
    Route::delete('/cv/{cvId}/experiences/{expId}',[CvController::class, 'destroyExperience'])->name('cv.experience.destroy');

    Route::post('/cv/{cvId}/education',            [CvController::class, 'storeEducation'])->name('cv.education.store');
    Route::put('/cv/{cvId}/education/{eduId}',     [CvController::class, 'updateEducation'])->name('cv.education.update');
    Route::delete('/cv/{cvId}/education/{eduId}',  [CvController::class, 'destroyEducation'])->name('cv.education.destroy');

    Route::post('/cv/{cvId}/skills',               [CvController::class, 'storeSkill'])->name('cv.skill.store');
    Route::put('/cv/{cvId}/skills/{skillId}',      [CvController::class, 'updateSkill'])->name('cv.skill.update');
    Route::delete('/cv/{cvId}/skills/{skillId}',   [CvController::class, 'destroySkill'])->name('cv.skill.destroy');

    Route::post('/cv/{cvId}/projects',             [CvController::class, 'storeProject'])->name('cv.project.store');
    Route::put('/cv/{cvId}/projects/{projectId}',  [CvController::class, 'updateProject'])->name('cv.project.update');
    Route::delete('/cv/{cvId}/projects/{projectId}',[CvController::class, 'destroyProject'])->name('cv.project.destroy');

    Route::post('/cv/{cvId}/reorder',              [CvController::class, 'reorder'])->name('cv.reorder');
    Route::post('/cv/{id}/photo',                  [CvController::class, 'uploadPhoto'])->name('cv.photo');
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
        $hasApplied = \App\Models\Application::where('user_id', $userId)
            ->where('vacancy_id', $vacancy->id)
            ->exists();

        if ($vacancy->is_expired && ! $hasApplied) {
            abort(404);
        }

        $vacancy->load('employer:id,name,company_name,employer_type,employer_verification_status,company_verification_status');

        return response()->json([
            'vacancy'     => $vacancy,
            'has_applied' => $hasApplied,
            'user_cvs'    => \App\Models\Cv::where('user_id', $userId)
                                 ->select('id', 'title', 'full_name', 'is_default', 'source', 'original_filename')
                                 ->get(),
        ]);
    })->name('api.vacancy.preview');

    // AI suggestions + invite (employer only)
    Route::get('/employer/jobs/{vacancy}/ai-suggestions', [VacancyController::class, 'aiSuggestions'])->name('employer.jobs.ai-suggestions');
    Route::post('/employer/jobs/{vacancy}/invite/{userId}', [VacancyController::class, 'inviteUser'])->name('employer.jobs.invite');

    Route::get('/quiz',                        [QuizController::class, 'index'])->name('quiz.index');
    Route::post('/quiz/generate',               [QuizController::class, 'generate'])->name('quiz.generate');
    Route::get('/quiz/{assessment}',            [QuizController::class, 'show'])->name('quiz.show');
    Route::post('/quiz/{assessment}/submit',    [QuizController::class, 'submit'])->name('quiz.submit');
});

// ── Chat (real-time via SSE) ───────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/chat',                                      [ChatController::class, 'index'])->name('chat.index');
    Route::post('/chat',                                     [ChatController::class, 'store'])->name('chat.store');
    Route::post('/chat/{conversation}/messages',             [ChatController::class, 'sendMessage'])->name('chat.send');
    Route::get('/chat/{conversation}/poll',                  [ChatController::class, 'poll'])->name('chat.poll');
    Route::patch('/chat/{conversation}/read',                [ChatController::class, 'markRead'])->name('chat.read');
});

require __DIR__.'/settings.php';
