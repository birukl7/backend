<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use App\Http\Controllers\CvController;

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

require __DIR__.'/settings.php';
