<?php

namespace App\Http\Controllers;

use App\Models\AiMatch;
use App\Models\Assessment;
use App\Models\AssessmentResult;
use App\Models\Cv;
use App\Models\CvSkill;
use Illuminate\Http\Request;

class QuizController extends Controller
{
    // GET /quiz — list all active quizzes with user's best result
    public function index()
    {
        $userId = auth()->id();

        $assessments = Assessment::where('is_active', true)
            ->withCount('questions')
            ->get()
            ->map(function ($a) use ($userId) {
                $best = AssessmentResult::where('assessment_id', $a->id)
                    ->where('user_id', $userId)
                    ->orderByDesc('score')
                    ->first();

                return [
                    'id'                 => $a->id,
                    'title'              => $a->title,
                    'description'        => $a->description,
                    'skill_name'         => $a->skill_name,
                    'category'           => $a->category,
                    'difficulty'         => $a->difficulty,
                    'time_limit_minutes' => $a->time_limit_minutes,
                    'pass_score'         => $a->pass_score,
                    'questions_count'    => $a->questions_count,
                    'user_best_result'   => $best ? [
                        'score'           => $best->score,
                        'passed'          => $best->passed,
                        'level'           => $best->level,
                        'correct_answers' => $best->correct_answers,
                        'total_questions' => $best->total_questions,
                        'taken_at'        => $best->created_at->toISOString(),
                    ] : null,
                ];
            });

        return inertia('quiz/index', ['assessments' => $assessments]);
    }

    // GET /quiz/{assessment} — show quiz details + questions (no correct-answer flags)
    public function show(Assessment $assessment)
    {
        $userId = auth()->id();

        $questions = $assessment->questions()
            ->with('options:id,question_id,option_text,sort_order')
            ->get()
            ->map(fn($q) => [
                'id'       => $q->id,
                'question' => $q->question,
                'options'  => $q->options->map(fn($o) => [
                    'id'          => $o->id,
                    'option_text' => $o->option_text,
                ])->values(),
            ]);

        $previousResult = AssessmentResult::where('assessment_id', $assessment->id)
            ->where('user_id', $userId)
            ->orderByDesc('score')
            ->first();

        return inertia('quiz/show', [
            'assessment' => [
                'id'                 => $assessment->id,
                'title'              => $assessment->title,
                'description'        => $assessment->description,
                'skill_name'         => $assessment->skill_name,
                'category'           => $assessment->category,
                'difficulty'         => $assessment->difficulty,
                'time_limit_minutes' => $assessment->time_limit_minutes,
                'pass_score'         => $assessment->pass_score,
            ],
            'questions'       => $questions,
            'previous_result' => $previousResult ? [
                'score'           => $previousResult->score,
                'passed'          => $previousResult->passed,
                'level'           => $previousResult->level,
                'correct_answers' => $previousResult->correct_answers,
                'total_questions' => $previousResult->total_questions,
                'taken_at'        => $previousResult->created_at->toISOString(),
            ] : null,
        ]);
    }

    // POST /quiz/{assessment}/submit — score answers, save result, update CV skill
    public function submit(Request $request, Assessment $assessment)
    {
        $request->validate([
            'answers'            => 'required|array',
            'answers.*'          => 'nullable|integer',
            'time_taken_seconds' => 'nullable|integer|min:0',
        ]);

        $userId    = auth()->id();
        $answers   = $request->answers; // [question_id => option_id]
        $timeTaken = $request->time_taken_seconds;

        $questions      = $assessment->questions()->with('options')->get();
        $totalQuestions = $questions->count();
        $correctAnswers = 0;
        $answersDetail  = [];

        foreach ($questions as $question) {
            $correctOption = $question->options->firstWhere('is_correct', true);
            $userOptionId  = isset($answers[$question->id]) ? (int) $answers[$question->id] : null;
            $isCorrect     = $correctOption && $userOptionId === $correctOption->id;

            if ($isCorrect) {
                $correctAnswers++;
            }

            $answersDetail[] = [
                'question_id'       => $question->id,
                'question'          => $question->question,
                'correct_option_id' => $correctOption?->id,
                'user_option_id'    => $userOptionId,
                'is_correct'        => $isCorrect,
                'explanation'       => $question->explanation,
                'options'           => $question->options->map(fn($o) => [
                    'id'          => $o->id,
                    'option_text' => $o->option_text,
                    'is_correct'  => $o->is_correct,
                ])->values(),
            ];
        }

        $score  = $totalQuestions > 0 ? round(($correctAnswers / $totalQuestions) * 100) : 0;
        $passed = $score >= $assessment->pass_score;

        $level = match (true) {
            $score >= 85 => 'advanced',
            $score >= 60 => 'intermediate',
            default      => 'beginner',
        };

        AssessmentResult::create([
            'assessment_id'      => $assessment->id,
            'user_id'            => $userId,
            'score'              => $score,
            'level'              => $level,
            'passed'             => $passed,
            'time_taken_seconds' => $timeTaken,
            'total_questions'    => $totalQuestions,
            'correct_answers'    => $correctAnswers,
        ]);

        // If passed → add/upgrade the skill in the user's default CV, clear AI cache
        $skillAdded = false;
        if ($passed) {
            $cv = Cv::where('user_id', $userId)->where('is_default', true)->first()
                ?? Cv::where('user_id', $userId)->first();

            if ($cv) {
                $proficiencyMap = [
                    'beginner'     => 'beginner',
                    'intermediate' => 'intermediate',
                    'advanced'     => 'expert',
                ];

                $existing = CvSkill::where('cv_id', $cv->id)
                    ->whereRaw('LOWER(skill_name) = ?', [strtolower($assessment->skill_name)])
                    ->first();

                if (!$existing) {
                    CvSkill::create([
                        'cv_id'             => $cv->id,
                        'skill_name'        => $assessment->skill_name,
                        'proficiency_level' => $proficiencyMap[$level] ?? 'intermediate',
                        'category'          => $assessment->category,
                        'sort_order'        => (CvSkill::where('cv_id', $cv->id)->max('sort_order') ?? 0) + 1,
                    ]);
                    $skillAdded = true;
                } elseif ($this->levelRank($level) > $this->levelRank($existing->proficiency_level)) {
                    $existing->update(['proficiency_level' => $proficiencyMap[$level] ?? 'intermediate']);
                    $skillAdded = true;
                }

                // Invalidate AI match cache so it re-runs with the new skill
                AiMatch::where('user_id', $userId)->delete();
            }
        }

        return response()->json([
            'score'           => $score,
            'passed'          => $passed,
            'level'           => $level,
            'correct_answers' => $correctAnswers,
            'total_questions' => $totalQuestions,
            'skill_added'     => $skillAdded,
            'skill_name'      => $assessment->skill_name,
            'answers_detail'  => $answersDetail,
        ]);
    }

    private function levelRank(string $level): int
    {
        return match ($level) {
            'expert'       => 4,
            'advanced'     => 3,
            'intermediate' => 2,
            default        => 1,
        };
    }
}
