<?php

use App\Http\Controllers\ApplicationController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use App\Http\Controllers\CvController;
use App\Http\Controllers\InterviewController;
use App\Http\Controllers\VacancyController;     

Route::get('/interview/schedule', [InterviewController::class, 'create'])->name('interview.create');

Route::post('/interview', [InterviewController::class, 'store'])->name('interview.store');

Route::get('/interview/test', [InterviewController::class, 'test'])->name('interview.test');

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    // Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::redirect('dashboard', 'jobs');
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
    Route::get('/jobs', function () {
        return inertia('vacancy/index', [
            'vacancies'        => \App\Models\Vacancy::where('status', 'open')->latest()->get(),
            // IDs of vacancies this user already applied to (drives the "Applied" badge)
            'applied_ids'      => \App\Models\Application::where('user_id', auth()->id())
                                      ->pluck('vacancy_id'),
            // User's CVs for the apply dialog dropdown
            'user_cvs'         => \App\Models\Cv::where('user_id', auth()->id())
                                      ->select('id', 'title', 'full_name', 'is_default')
                                      ->get(),
        ]);
    })->name('jobs.index');
 
    // Submit application
    Route::post('/applications', [ApplicationController::class, 'store'])->name('applications.store');
 
    // My applications list
    Route::get('/my-applications', [ApplicationController::class, 'index'])->name('applications.index');
 
    // Withdraw
    Route::delete('/applications/{application}', [ApplicationController::class, 'destroy'])->name('applications.destroy');
});


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/cv',              [CvController::class, 'index'])->name('cv.index');
    Route::get('/cv/create',       [CvController::class, 'create'])->name('cv.create');
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
});


require __DIR__.'/settings.php';
