<?php

use App\Http\Controllers\AiMatchController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->post('/ai/match', [AiMatchController::class, 'match']);

// Vacancy preview route is defined in web.php so it runs under the web
// session middleware stack — see routes/web.php.
