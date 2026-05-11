<?php

namespace App\Http\Controllers;

use App\Models\Vacancy;
use App\Services\AiMatchingService;
use Illuminate\Http\Request;

class AiMatchController extends Controller
{
    public function __construct(private AiMatchingService $aiService) {}

    /**
     * POST /api/ai/match
     * Body: { cv_id?: int }  (optional; falls back to default CV)
     * Returns: { matches: { vacancy_id: score } }
     */
    public function match(Request $request)
    {
        $user      = $request->user();
        $vacancies = Vacancy::where('status', 'open')
            ->select('id', 'title', 'description', 'requirements')
            ->get()
            ->toArray();

        $scoreMap = $this->aiService->matchForUser($user->id, $vacancies);

        return response()->json(['matches' => $scoreMap]);
    }
}
