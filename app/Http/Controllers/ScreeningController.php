<?php

namespace App\Http\Controllers;

use App\Models\JobScreening;
use App\Models\ScreeningResponse;
use App\Models\Vacancy;
use App\Services\AiScreeningService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ScreeningController extends Controller
{
    /**
     * POST /screening/{vacancy}/start
     * Start a screening session for the current user (or return the existing
     * in-progress one).
     */
    public function start(Vacancy $vacancy)
    {
        abort_if($vacancy->is_expired, 422, 'The application deadline for this job has passed.');

        $screening = $vacancy->screening;
        abort_if(!$screening || !$screening->is_enabled, 404, 'No screening is required for this job.');

        $userId = auth()->id();

        $response = ScreeningResponse::firstOrCreate(
            ['vacancy_id' => $vacancy->id, 'user_id' => $userId, 'status' => 'in_progress'],
            [
                'transcript' => [],
                'answers'    => [],
            ]
        );

        // Seed the first message if the transcript is empty
        if (empty($response->transcript)) {
            $intro     = $screening->intro_message ?: "Hi! I'm the AI screener for this role.";
            $firstQ    = collect($screening->questions ?? [])->first();
            $firstText = $firstQ['text'] ?? 'Tell me a bit about your relevant experience for this role.';

            $response->update([
                'transcript' => [
                    ['role' => 'ai', 'text' => $intro,     'ts' => now()->toIso8601String()],
                    ['role' => 'ai', 'text' => $firstText, 'ts' => now()->toIso8601String(), 'qid' => $firstQ['id'] ?? null],
                ],
            ]);
        }

        return response()->json([
            'response_id'   => $response->id,
            'transcript'    => $response->transcript,
            'screening'     => [
                'intro_message' => $screening->intro_message,
                'questions'     => $screening->questions,
            ],
            'vacancy_title' => $vacancy->title,
        ]);
    }

    /**
     * POST /screening/{response}/message
     * Submit the candidate's reply and get the AI's next message.
     */
    public function message(Request $request, ScreeningResponse $response, AiScreeningService $ai)
    {
        abort_if($response->user_id !== auth()->id(), 403);
        abort_if($response->status !== 'in_progress', 422, 'Screening already submitted.');

        $data = $request->validate(['message' => 'required|string|max:3000']);

        $screening = $response->vacancy->screening;
        abort_if(!$screening, 404);

        // Append user message
        $transcript = $response->transcript ?? [];
        $transcript[] = ['role' => 'user', 'text' => $data['message'], 'ts' => now()->toIso8601String()];

        // Persist user turn immediately so a failure mid-AI call doesn't lose the answer
        $response->update(['transcript' => $transcript]);

        // Ask AI for next reply
        $aiReply = $ai->chatNext($response->fresh(), $screening, $data['message']);

        // Append AI reply
        $transcript[] = [
            'role' => 'ai',
            'text' => $aiReply['reply'],
            'ts'   => now()->toIso8601String(),
            'qid'  => $aiReply['next_question_id'] ?? null,
            'done' => (bool) $aiReply['done'],
        ];

        // Track the structured answer against the *previous* AI question (if any)
        $answers = $response->answers ?? [];
        $previousAiQid = null;
        for ($i = count($transcript) - 2; $i >= 0; $i--) {
            if (($transcript[$i]['role'] ?? null) === 'ai' && !empty($transcript[$i]['qid'])) {
                $previousAiQid = $transcript[$i]['qid'];
                break;
            }
        }
        if ($previousAiQid) {
            $answers[$previousAiQid] = $data['message'];
        }

        $response->update([
            'transcript' => $transcript,
            'answers'    => $answers,
        ]);

        return response()->json([
            'reply'      => $aiReply['reply'],
            'done'       => (bool) $aiReply['done'],
            'transcript' => $transcript,
        ]);
    }

    /**
     * POST /screening/{response}/complete
     * Finalise the screening: run AI evaluation, store score & summary.
     */
    public function complete(ScreeningResponse $response, AiScreeningService $ai)
    {
        abort_if($response->user_id !== auth()->id(), 403);
        abort_if($response->status !== 'in_progress', 422, 'Already completed.');

        $screening = $response->vacancy->screening;
        abort_if(!$screening, 404);

        $eval = $ai->evaluate($response, $screening);

        $response->update([
            'ai_score'       => $eval['ai_score'],
            'ai_summary'     => $eval['ai_summary'],
            'ai_strengths'   => $eval['ai_strengths'],
            'ai_concerns'    => $eval['ai_concerns'],
            'recommendation' => $eval['recommendation'],
            'status'         => 'completed',
            'completed_at'   => Carbon::now(),
        ]);

        return response()->json([
            'screening_response' => $response->fresh(),
        ]);
    }

    /**
     * GET /employer/applications/{application}/screening
     * Employer-only: get the full screening report for an applicant.
     */
    public function showForEmployer(\App\Models\Application $application)
    {
        abort_if($application->vacancy->user_id !== auth()->id(), 403);

        $response = ScreeningResponse::where('vacancy_id', $application->vacancy_id)
            ->where('user_id', $application->user_id)
            ->latest()
            ->first();

        return response()->json(['screening_response' => $response]);
    }
}
