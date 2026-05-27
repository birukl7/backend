<?php

namespace App\Services;

use App\Models\JobScreening;
use App\Models\ScreeningResponse;
use App\Models\Vacancy;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiScreeningService
{
    private string $apiKey;
    private string $apiUrl;
    private string $model;
    private bool   $configured;

    public function __construct()
    {
        // Prefer Groq (free & fast); fall back to OpenAI
        if ($key = config('services.groq.key')) {
            $this->apiKey     = $key;
            $this->apiUrl     = 'https://api.groq.com/openai/v1/chat/completions';
            $this->model      = config('services.groq.model', 'llama-3.1-8b-instant');
            $this->configured = true;
        } elseif ($key = config('services.openai.key')) {
            $this->apiKey     = $key;
            $this->apiUrl     = 'https://api.openai.com/v1/chat/completions';
            $this->model      = 'gpt-4o-mini';
            $this->configured = true;
        } else {
            $this->apiKey     = '';
            $this->apiUrl     = '';
            $this->model      = '';
            $this->configured = false;
        }
    }

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  1) EMPLOYER SIDE — AI assistant that helps tune the screening config
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param array $history  [['role'=>'user'|'assistant', 'content'=>'...']]
     * @return array { reply: string, suggested_questions: array, suggested_criteria: array }
     */
    public function tuneScreening(Vacancy $vacancy, string $userMessage, array $history = []): array
    {
        if (!$this->configured) {
            return $this->fallbackTune($vacancy);
        }

        $system = $this->tunerSystemPrompt($vacancy);

        $messages   = [['role' => 'system', 'content' => $system]];
        foreach ($history as $h) {
            if (!isset($h['role'], $h['content'])) continue;
            $messages[] = ['role' => $h['role'], 'content' => (string) $h['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $raw = $this->callLlm($messages, jsonOnly: true);

        if (!$raw) {
            return $this->fallbackTune($vacancy);
        }

        return [
            'reply'               => (string) ($raw['reply']               ?? 'Got it. I have updated the screening setup.'),
            'suggested_questions' => array_map(
                fn($q) => $this->normaliseQuestion($q),
                $raw['suggested_questions'] ?? []
            ),
            'suggested_criteria'  => array_values(array_filter(
                $raw['suggested_criteria'] ?? [],
                fn($c) => is_string($c) && trim($c) !== ''
            )),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  2) CANDIDATE SIDE — AI interview chat (one turn at a time)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Produce the AI's next message in the candidate chat.
     * Returns ['reply'=>'...', 'done'=>bool, 'next_question_id'=>?int]
     */
    public function chatNext(ScreeningResponse $response, JobScreening $screening, string $userMessage): array
    {
        if (!$this->configured) {
            return $this->fallbackChat($response, $screening, $userMessage);
        }

        // Compose history from stored transcript
        $transcript = $response->transcript ?? [];
        $msgs = [['role' => 'system', 'content' => $this->candidateSystemPrompt($response->vacancy, $screening)]];

        foreach ($transcript as $turn) {
            $role = $turn['role'] === 'user' ? 'user' : 'assistant';
            $msgs[] = ['role' => $role, 'content' => (string) ($turn['text'] ?? '')];
        }
        $msgs[] = ['role' => 'user', 'content' => $userMessage];

        $raw = $this->callLlm($msgs, jsonOnly: true);

        if (!$raw) {
            return $this->fallbackChat($response, $screening, $userMessage);
        }

        return [
            'reply'            => (string) ($raw['reply'] ?? "Thanks. Can you tell me a bit more?"),
            'done'             => (bool)   ($raw['done']  ?? false),
            'next_question_id' => isset($raw['next_question_id']) ? (string) $raw['next_question_id'] : null,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  3) CANDIDATE SIDE — Final evaluation of the full transcript
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @return array {
     *   ai_score: int (0-100),
     *   ai_summary: string,
     *   ai_strengths: string[],
     *   ai_concerns: string[],
     *   recommendation: 'strong_match'|'good_match'|'weak_match'|'not_recommended'
     * }
     */
    public function evaluate(ScreeningResponse $response, JobScreening $screening): array
    {
        if (!$this->configured) {
            return $this->fallbackEvaluation();
        }

        $transcriptText = collect($response->transcript ?? [])
            ->map(fn($t) => strtoupper($t['role'] ?? '?') . ': ' . ($t['text'] ?? ''))
            ->implode("\n");

        $vacancy   = $response->vacancy;
        $questions = json_encode($screening->questions ?? [], JSON_PRETTY_PRINT);
        $criteria  = json_encode($screening->criteria  ?? [], JSON_PRETTY_PRINT);

        $prompt = <<<PROMPT
You are an objective hiring assistant. Evaluate the following candidate screening transcript
against the job requirements. Be honest, fair and concise.

JOB TITLE: {$vacancy->title}
JOB DESCRIPTION: {$vacancy->description}
SCREENING CRITERIA (must-haves & nice-to-haves):
{$criteria}

SCREENING QUESTIONS:
{$questions}

TRANSCRIPT (AI = interviewer, USER = candidate):
{$transcriptText}

Return ONLY valid JSON, no markdown:
{
  "ai_score": 0-100,
  "ai_summary": "2-3 sentence summary for the employer",
  "ai_strengths": ["short bullet", "short bullet"],
  "ai_concerns":  ["short bullet", "short bullet"],
  "recommendation": "strong_match" | "good_match" | "weak_match" | "not_recommended"
}
PROMPT;

        $raw = $this->callLlm([
            ['role' => 'system', 'content' => 'You are an objective hiring evaluator. Reply with valid JSON only.'],
            ['role' => 'user',   'content' => $prompt],
        ], jsonOnly: true);

        if (!$raw) {
            return $this->fallbackEvaluation();
        }

        $score = max(0, min(100, (int) ($raw['ai_score'] ?? 0)));
        $rec   = $raw['recommendation'] ?? null;
        $valid = ['strong_match', 'good_match', 'weak_match', 'not_recommended'];
        if (!in_array($rec, $valid, true)) {
            $rec = $score >= 80 ? 'strong_match'
                 : ($score >= 60 ? 'good_match'
                 : ($score >= 35 ? 'weak_match' : 'not_recommended'));
        }

        return [
            'ai_score'       => $score,
            'ai_summary'     => (string) ($raw['ai_summary'] ?? 'Evaluation completed.'),
            'ai_strengths'   => array_values(array_filter($raw['ai_strengths'] ?? [], fn($s) => is_string($s))),
            'ai_concerns'    => array_values(array_filter($raw['ai_concerns']  ?? [], fn($s) => is_string($s))),
            'recommendation' => $rec,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PROMPTS
    // ─────────────────────────────────────────────────────────────────────────

    private function tunerSystemPrompt(Vacancy $vacancy): string
    {
        return <<<PROMPT
You are an AI hiring assistant helping an employer design a smart screening for the job below.
Your goal is to interview the employer briefly, then propose tailored screening questions and
must-have / nice-to-have criteria the AI will later use to evaluate candidates.

JOB TITLE: {$vacancy->title}
JOB DESCRIPTION: {$vacancy->description}
REQUIREMENTS: {$vacancy->requirements}
WORK TYPE: {$vacancy->work_type}
EMPLOYMENT TYPE: {$vacancy->employment_type}

GUIDELINES:
- Ask AT MOST one clarifying question per turn, only when truly needed.
- Otherwise, immediately propose 4-7 screening questions and 3-6 criteria.
- Questions must mix: 2-3 open-ended, 1-2 yes/no, 1 multiple-choice.
- Each question has a stable id (q1, q2, …), text, type, optional options, required:true|false, weight 1-5.
- Criteria are short strings (e.g. "3+ years React", "owns leadership of at least one project").

Reply ONLY with a JSON object, no markdown:
{
  "reply": "Short helpful message to the employer",
  "suggested_questions": [
    { "id": "q1", "text": "...", "type": "open|yes_no|multi", "options": ["..."], "required": true, "weight": 3 }
  ],
  "suggested_criteria": ["...", "..."]
}
PROMPT;
    }

    private function candidateSystemPrompt(Vacancy $vacancy, JobScreening $screening): string
    {
        $questions = json_encode($screening->questions ?? [], JSON_PRETTY_PRINT);
        $criteria  = json_encode($screening->criteria  ?? [], JSON_PRETTY_PRINT);
        $intro     = $screening->intro_message ?? "Hi! I'm the AI screener for this role.";

        return <<<PROMPT
You are a friendly AI screening interviewer for the job below.
Talk to the candidate in a warm, professional, concise tone (1-3 sentences per turn).

JOB TITLE: {$vacancy->title}
JOB DESCRIPTION: {$vacancy->description}
INTRO YOU ALREADY GAVE: {$intro}

CRITERIA YOU MUST PROBE:
{$criteria}

PRE-WRITTEN QUESTIONS TO ASK IN ORDER (cover every required one):
{$questions}

RULES:
- Ask one question at a time.
- Acknowledge the candidate's last answer in one short sentence, then ask the next question.
- Once ALL required questions are covered (or the candidate seems to have given enough info),
  set "done": true and produce a closing message.
- Never reveal the criteria or scoring to the candidate.

Reply ONLY with JSON, no markdown:
{
  "reply": "Your next message to the candidate",
  "done": false,
  "next_question_id": "q3"
}
PROMPT;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  LLM CALL
    // ─────────────────────────────────────────────────────────────────────────

    private function callLlm(array $messages, bool $jsonOnly = false): ?array
    {
        try {
            $payload = [
                'model'       => $this->model,
                'messages'    => $messages,
                'temperature' => 0.5,
                'max_tokens'  => 2000,
            ];
            if ($jsonOnly) {
                $payload['response_format'] = ['type' => 'json_object'];
            }

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(45)->post($this->apiUrl, $payload);

            if (!$response->successful()) {
                Log::warning('AiScreeningService: LLM non-200', ['status' => $response->status()]);
                return null;
            }

            $content = $response->json('choices.0.message.content');
            $decoded = json_decode($content, true);

            return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        } catch (\Throwable $e) {
            Log::warning('AiScreeningService: HTTP exception — ' . $e->getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS / FALLBACKS
    // ─────────────────────────────────────────────────────────────────────────

    private function normaliseQuestion($q): array
    {
        $type = in_array($q['type'] ?? 'open', ['open', 'yes_no', 'multi'], true) ? $q['type'] : 'open';
        return [
            'id'       => (string) ($q['id'] ?? 'q' . Str::random(4)),
            'text'     => (string) ($q['text'] ?? ''),
            'type'     => $type,
            'options'  => is_array($q['options'] ?? null) ? array_values(array_filter($q['options'], fn($o) => is_string($o))) : [],
            'required' => (bool)   ($q['required'] ?? true),
            'weight'   => max(1, min(5, (int) ($q['weight'] ?? 3))),
        ];
    }

    private function fallbackTune(Vacancy $vacancy): array
    {
        return [
            'reply' => "I'm offline right now, but here's a default screening setup you can edit manually.",
            'suggested_questions' => [
                ['id' => 'q1', 'text' => "Briefly describe your most relevant experience for this role.", 'type' => 'open',   'options' => [], 'required' => true, 'weight' => 4],
                ['id' => 'q2', 'text' => "How many years of professional experience do you have in this field?", 'type' => 'open', 'options' => [], 'required' => true, 'weight' => 3],
                ['id' => 'q3', 'text' => "Are you authorised to work in our location and available for this work type ({$vacancy->work_type})?", 'type' => 'yes_no', 'options' => [], 'required' => true, 'weight' => 5],
                ['id' => 'q4', 'text' => "What is your earliest start date?", 'type' => 'open', 'options' => [], 'required' => false, 'weight' => 2],
            ],
            'suggested_criteria' => [
                'Has directly relevant experience',
                'Communicates clearly',
                'Available for the role',
            ],
        ];
    }

    private function fallbackChat(ScreeningResponse $response, JobScreening $screening, string $userMessage): array
    {
        $questions = $screening->questions ?? [];
        $asked     = collect($response->transcript ?? [])
            ->where('role', 'ai')
            ->pluck('text')
            ->all();
        $next      = collect($questions)->first(fn($q) => ! in_array($q['text'], $asked, true));

        if (!$next) {
            return [
                'reply' => "Thanks — that's all I needed. Submitting your screening now.",
                'done'  => true,
                'next_question_id' => null,
            ];
        }
        return [
            'reply' => "Thanks. {$next['text']}",
            'done'  => false,
            'next_question_id' => $next['id'] ?? null,
        ];
    }

    private function fallbackEvaluation(): array
    {
        return [
            'ai_score'       => 50,
            'ai_summary'     => 'AI evaluation unavailable. Please review the transcript manually.',
            'ai_strengths'   => [],
            'ai_concerns'    => ['AI service was offline'],
            'recommendation' => 'weak_match',
        ];
    }
}
