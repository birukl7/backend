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
        $msgs = [['role' => 'system', 'content' => $this->candidateSystemPrompt(
            $response->vacancy,
            $screening,
            $transcript,
        )]];

        foreach ($transcript as $turn) {
            $role = $turn['role'] === 'user' ? 'user' : 'assistant';
            $msgs[] = ['role' => $role, 'content' => (string) ($turn['text'] ?? '')];
        }
        $msgs[] = ['role' => 'user', 'content' => $userMessage];

        $raw = $this->callLlm($msgs, jsonOnly: true);

        if (!$raw) {
            return $this->fallbackChat($response, $screening, $userMessage);
        }

        return $this->normaliseChatReply(
            $response,
            $screening,
            [
                'reply'            => (string) ($raw['reply'] ?? "Thanks. Can you tell me a bit more?"),
                'done'             => (bool)   ($raw['done']  ?? false),
                'next_question_id' => isset($raw['next_question_id']) ? (string) $raw['next_question_id'] : null,
            ],
        );
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

    private function candidateSystemPrompt(Vacancy $vacancy, JobScreening $screening, array $transcript = []): string
    {
        $questions = $screening->questions ?? [];
        $criteria  = json_encode($screening->criteria ?? [], JSON_PRETTY_PRINT);
        $intro     = $screening->intro_message ?? "Hi! I'm the AI screener for this role.";
        $progress  = $this->resolveTurnProgress($transcript, $questions);

        $askedIds   = $this->askedQuestionIds($transcript);
        $covered    = $this->formatCoveredQuestions($questions, $askedIds);
        $nextBlock  = $this->formatNextQuestionBlock($progress);
        $questionsJson = json_encode($questions, JSON_PRETTY_PRINT);

        return <<<PROMPT
You are a friendly AI screening interviewer for the job below.
Talk to the candidate in a warm, professional, concise tone (1-3 sentences per turn).

JOB TITLE: {$vacancy->title}
JOB DESCRIPTION: {$vacancy->description}
INTRO YOU ALREADY GAVE: {$intro}

CRITERIA YOU MUST PROBE:
{$criteria}

PRE-WRITTEN QUESTIONS TO ASK IN ORDER (cover every required one):
{$questionsJson}

PROGRESS:
{$covered}
{$nextBlock}

RULES:
- NEVER repeat a question that is already listed under ALREADY COVERED.
- Ask one pre-written list question at a time, in order. Cover every required question before finishing.
- Allow AT MOST one brief clarifying follow-up when the candidate's latest answer was empty, off-topic, or clearly insufficient — then move on to the next list question even if the answer remains weak.
- Do not ask the candidate to elaborate on the same topic more than once.
- Every turn while screening is in progress MUST include exactly one clear question (use "?" in the reply), except when "done" is true.
- Structure each reply as: one brief acknowledgment + one question. Never send only praise or a comment with no question.
- Set "done": true ONLY after all required questions are covered; then use a short closing message with no new question.
- Set "next_question_id" to the id of the list question you are asking this turn (null only for a one-time clarifying follow-up on the current topic).
- Never reveal the criteria or scoring to the candidate.

Reply ONLY with JSON, no markdown:
{
  "reply": "Brief acknowledgment + one question for the candidate",
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

    /**
     * @param  array{reply: string, done: bool, next_question_id: ?string}  $reply
     * @return array{reply: string, done: bool, next_question_id: ?string}
     */
    private function normaliseChatReply(ScreeningResponse $response, JobScreening $screening, array $reply): array
    {
        $transcript = $response->transcript ?? [];
        $questions  = $screening->questions ?? [];
        $askedIds   = $this->askedQuestionIds($transcript);
        $progress   = $this->resolveTurnProgress($transcript, $questions);

        $repeatsCoveredQuestion = $this->replyRepeatsCoveredQuestion($reply['reply'], $questions, $askedIds)
            || (
                !empty($reply['next_question_id'])
                && in_array((string) $reply['next_question_id'], $askedIds, true)
            );

        if ($repeatsCoveredQuestion && $progress['type'] === 'follow_up') {
            $next = $this->nextUnaskedQuestion($questions, $askedIds);
            $progress = $next
                ? ['type' => 'next_question', 'question' => $next]
                : ['type' => 'done'];
        }

        if ($reply['done']) {
            if ($progress['type'] !== 'done') {
                $reply['done'] = false;
            } else {
                return $reply;
            }
        }

        if ($progress['type'] === 'follow_up') {
            $reply['done']             = false;
            $reply['next_question_id'] = null;

            if (!$this->replyContainsQuestion($reply['reply'])) {
                $reply['reply'] = $this->appendQuestionToReply(
                    $reply['reply'],
                    'Could you share a bit more detail on that?',
                );
            }

            return $reply;
        }

        if ($progress['type'] === 'next_question') {
            $next = $progress['question'];
            $reply['reply']            = $this->buildReplyWithQuestion($reply['reply'], (string) ($next['text'] ?? ''));
            $reply['next_question_id'] = (string) ($next['id'] ?? '');
            $reply['done']             = false;

            return $reply;
        }

        $reply['done'] = true;
        if ($this->replyContainsQuestion($reply['reply'])) {
            $reply['reply'] = $this->extractAcknowledgment($reply['reply']);
        }
        if (trim($reply['reply']) === '') {
            $reply['reply'] = "Thanks for being honest — that covers everything I needed for this screening.";
        } elseif (!str_contains(strtolower($reply['reply']), 'thanks')) {
            $reply['reply'] = rtrim($reply['reply'], " \t\n\r\0\x0B.!") . '. Thanks — that covers everything I needed for this screening.';
        }

        return $reply;
    }

    /** @param  array<int, array<string, mixed>>  $questions */
    private function hasPendingRequiredQuestions(array $questions, array $askedIds): bool
    {
        foreach ($questions as $q) {
            if (!($q['required'] ?? true)) {
                continue;
            }
            $id = (string) ($q['id'] ?? '');
            if ($id === '' || !in_array($id, $askedIds, true)) {
                return true;
            }
        }

        return false;
    }

    /** @param  array<int, array<string, mixed>>  $transcript */
    private function askedQuestionIds(array $transcript): array
    {
        $ids = [];
        foreach ($transcript as $turn) {
            if (($turn['role'] ?? null) === 'ai' && !empty($turn['qid'])) {
                $ids[] = (string) $turn['qid'];
            }
        }

        return array_values(array_unique($ids));
    }

    /** @param  array<int, array<string, mixed>>  $questions */
    private function nextUnaskedQuestion(array $questions, array $askedIds): ?array
    {
        foreach ($questions as $q) {
            $id = (string) ($q['id'] ?? '');
            if ($id === '' || in_array($id, $askedIds, true)) {
                continue;
            }

            return $q;
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $transcript
     * @param  array<int, array<string, mixed>>  $questions
     * @return array{type: 'follow_up'|'next_question'|'done', qid?: string, question?: array<string, mixed>}
     */
    private function resolveTurnProgress(array $transcript, array $questions): array
    {
        $askedIds = $this->askedQuestionIds($transcript);

        if (!$this->hasPendingRequiredQuestions($questions, $askedIds)) {
            return ['type' => 'done'];
        }

        $lastQid = $this->lastAskedQuestionId($transcript);
        if ($lastQid !== null && $this->canFollowUpOnQuestion($transcript, $lastQid)) {
            return ['type' => 'follow_up', 'qid' => $lastQid];
        }

        $next = $this->nextUnaskedQuestion($questions, $askedIds);
        if ($next) {
            return ['type' => 'next_question', 'question' => $next];
        }

        return ['type' => 'done'];
    }

    /** @param  array<int, array<string, mixed>>  $transcript */
    private function lastAskedQuestionId(array $transcript): ?string
    {
        for ($i = count($transcript) - 1; $i >= 0; $i--) {
            if (($transcript[$i]['role'] ?? null) === 'ai' && !empty($transcript[$i]['qid'])) {
                return (string) $transcript[$i]['qid'];
            }
        }

        return null;
    }

    /** @param  array<int, array<string, mixed>>  $transcript */
    private function canFollowUpOnQuestion(array $transcript, string $qid): bool
    {
        $seenQid       = false;
        $userResponses = 0;
        $followUpsSent = 0;

        foreach ($transcript as $turn) {
            $role = $turn['role'] ?? null;
            $turnQid = isset($turn['qid']) ? (string) $turn['qid'] : null;

            if ($role === 'ai' && $turnQid === $qid) {
                if (!$seenQid) {
                    $seenQid = true;
                    $userResponses = 0;
                    $followUpsSent = 0;
                }

                continue;
            }

            if (!$seenQid) {
                continue;
            }

            if ($role === 'user') {
                $userResponses++;

                continue;
            }

            if ($role === 'ai') {
                if ($turnQid === null || $turnQid === '') {
                    $followUpsSent++;
                }

                break;
            }
        }

        return $userResponses === 1 && $followUpsSent === 0;
    }

    /** @param  array<int, array<string, mixed>>  $questions */
    private function formatCoveredQuestions(array $questions, array $askedIds): string
    {
        if ($askedIds === []) {
            return 'ALREADY COVERED: (none yet)';
        }

        $lines = ['ALREADY COVERED (do NOT ask again):'];
        foreach ($questions as $q) {
            $id = (string) ($q['id'] ?? '');
            if ($id === '' || !in_array($id, $askedIds, true)) {
                continue;
            }

            $lines[] = "- {$id}: " . (string) ($q['text'] ?? '');
        }

        return implode("\n", $lines);
    }

    /** @param  array{type: string, qid?: string, question?: array<string, mixed>}  $progress */
    private function formatNextQuestionBlock(array $progress): string
    {
        if ($progress['type'] === 'follow_up') {
            return 'NEXT ACTION: Ask ONE brief clarifying follow-up on the candidate\'s latest answer, then move on.';
        }

        if ($progress['type'] === 'next_question') {
            $next = $progress['question'] ?? [];
            $id   = (string) ($next['id'] ?? '');
            $text = (string) ($next['text'] ?? '');

            return "NEXT QUESTION TO ASK (use this exact id in next_question_id):\n{$id}: {$text}";
        }

        return 'NEXT ACTION: All required questions are covered — set done to true with a brief closing message.';
    }

    private function buildReplyWithQuestion(string $llmReply, string $questionText): string
    {
        $questionText = trim($questionText);
        if ($questionText === '') {
            return trim($llmReply);
        }

        if (trim($llmReply) === $questionText || str_contains($llmReply, $questionText)) {
            return trim($llmReply);
        }

        $ack = $this->extractAcknowledgment($llmReply);
        if ($ack === '' || $this->isGenericAcknowledgment($ack)) {
            $ack = "Thanks for sharing.";
        }

        return $this->appendQuestionToReply($ack, $questionText);
    }

    private function extractAcknowledgment(string $reply): string
    {
        $reply = trim($reply);
        $pos   = strpos($reply, '?');
        if ($pos === false) {
            return $reply;
        }

        $ack = trim(substr($reply, 0, $pos));
        if (preg_match('/^(.*[.!])\s*[^.!]*$/s', $ack, $matches)) {
            return trim($matches[1]);
        }

        return '';
    }

    private function isGenericAcknowledgment(string $ack): bool
    {
        $normalised = strtolower(trim($ack, " \t\n\r\0\x0B.!"));

        return in_array($normalised, [
            'thanks for sharing',
            'thank you for sharing',
            'thanks',
            'thank you',
            'got it',
            'understood',
            'that\'s great',
            'that\'s okay',
            'that is okay',
            'it\'s okay',
        ], true);
    }

    /** @param  array<int, array<string, mixed>>  $questions */
    private function replyRepeatsCoveredQuestion(string $reply, array $questions, array $askedIds): bool
    {
        foreach ($questions as $q) {
            $id   = (string) ($q['id'] ?? '');
            $text = trim((string) ($q['text'] ?? ''));
            if ($id === '' || $text === '' || !in_array($id, $askedIds, true)) {
                continue;
            }

            if (stripos($reply, $text) !== false) {
                return true;
            }
        }

        return false;
    }

    private function replyContainsQuestion(string $reply): bool
    {
        return str_contains($reply, '?');
    }

    private function appendQuestionToReply(string $reply, string $questionText): string
    {
        $reply = trim($reply);
        $questionText = trim($questionText);
        if ($questionText === '') {
            return $reply;
        }

        if ($reply === '') {
            return $questionText;
        }

        if (str_ends_with($reply, '?')) {
            return $reply;
        }

        return rtrim($reply, " \t\n\r\0\x0B.!") . '. ' . $questionText;
    }

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
        $transcript = $response->transcript ?? [];
        $questions  = $screening->questions ?? [];
        $progress   = $this->resolveTurnProgress($transcript, $questions);

        if ($progress['type'] === 'follow_up') {
            return [
                'reply'            => 'Could you share a bit more detail on that?',
                'done'             => false,
                'next_question_id' => null,
            ];
        }

        if ($progress['type'] === 'next_question') {
            $next         = $progress['question'];
            $questionText = (string) ($next['text'] ?? '');

            return [
                'reply'            => $this->appendQuestionToReply('Thanks for sharing.', $questionText),
                'done'             => false,
                'next_question_id' => $next['id'] ?? null,
            ];
        }

        return [
            'reply'            => "Thanks — that's all I needed. Submitting your screening now.",
            'done'             => true,
            'next_question_id' => null,
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
