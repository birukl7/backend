<?php

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

    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // ✅ CV ROUTES (MOVE HERE)
    Route::get('/cv/create', [CvController::class, 'create'])->name('cv.create');
    Route::post('/cv', [CvController::class, 'store'])->name('cv.store');
    Route::get('/cv/{id}', [CvController::class, 'show'])->name('cv.show');
});

Route::resource('jobs', VacancyController::class)->middleware(['auth', 'verified']);

require __DIR__.'/settings.php';
