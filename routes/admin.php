<?php

use App\Http\Controllers\Admin\CompanyVerificationController;
use App\Http\Controllers\Admin\ContentApprovalController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmployerVerificationController;
use App\Http\Controllers\Admin\JobModerationController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\SuspiciousUserController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::get('/employer-verifications', [EmployerVerificationController::class, 'index'])->name('employer-verifications.index');
        Route::get('/employer-verifications/{user}', [EmployerVerificationController::class, 'show'])->name('employer-verifications.show');
        Route::patch('/employer-verifications/{user}', [EmployerVerificationController::class, 'update'])->name('employer-verifications.update');

        Route::get('/company-verifications', [CompanyVerificationController::class, 'index'])->name('company-verifications.index');
        Route::get('/company-verifications/{user}', [CompanyVerificationController::class, 'show'])->name('company-verifications.show');
        Route::patch('/company-verifications/{user}', [CompanyVerificationController::class, 'update'])->name('company-verifications.update');

        Route::get('/job-moderation', [JobModerationController::class, 'index'])->name('job-moderation.index');
        Route::get('/job-moderation/{vacancy}', [JobModerationController::class, 'show'])->name('job-moderation.show');
        Route::patch('/job-moderation/{vacancy}', [JobModerationController::class, 'update'])->name('job-moderation.update');

        Route::get('/suspicious-users', [SuspiciousUserController::class, 'index'])->name('suspicious-users.index');
        Route::get('/suspicious-users/{user}', [SuspiciousUserController::class, 'show'])->name('suspicious-users.show');
        Route::patch('/suspicious-users/{user}', [SuspiciousUserController::class, 'update'])->name('suspicious-users.update');

        Route::get('/content-approval', [ContentApprovalController::class, 'index'])->name('content-approval.index');
        Route::get('/content-approval/quizzes/{assessment}', [ContentApprovalController::class, 'showQuiz'])->name('content-approval.quiz.show');
        Route::patch('/content-approval/quizzes/{assessment}', [ContentApprovalController::class, 'updateQuiz'])->name('content-approval.quiz.update');
        Route::get('/content-approval/summaries/{cv}', [ContentApprovalController::class, 'showSummary'])->name('content-approval.summary.show');
        Route::patch('/content-approval/summaries/{cv}', [ContentApprovalController::class, 'updateSummary'])->name('content-approval.summary.update');

        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    });
