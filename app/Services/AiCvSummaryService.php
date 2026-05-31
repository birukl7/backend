<?php

namespace App\Services;

use App\Models\Cv;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiCvSummaryService
{
    private string $apiKey;
    private string $apiUrl;
    private string $model;
    private bool   $configured;

    public function __construct(private CvTextExtractorService $extractor)
    {
        // Prefer Groq (free & fast); fall back to OpenAI
        if ($key = config('services.groq.key')) {
            $this->apiKey     = $key;
            $this->apiUrl     = 'https://api.groq.com/openai/v1/chat/completions';
            $this->model      = (string) config('services.groq.model', 'llama-3.1-8b-instant');
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
    //  SEEKER VIEW — generate a polished summary + actionable suggestions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Return:
     *   - ai_summary        : a 3-4 sentence professional summary the user can use
     *   - ai_suggestions    : [{ section, advice }] — concrete improvement tips
     *   - ai_improvements   : [{ section, current, suggested }] — example rewrites
     *   - ai_strength_score : 0-100 overall CV strength
     */
    public function generateForSeeker(Cv $cv): array
    {
        $cvText = $this->cvToText($cv);

        $prompt = <<<PROMPT
You are an expert resume coach. Read the CV below and:
1) Write a strong 3-4 sentence professional SUMMARY in first person ("I am…"). Use the candidate's real experience, focus on impact, avoid clichés.
2) Identify 3-6 ACTIONABLE SUGGESTIONS to improve specific sections.
3) Provide 2-4 concrete BEFORE→AFTER rewrites of weak lines (or missing items the candidate should add).
4) Give a STRENGTH SCORE from 0-100 reflecting overall resume quality.

CV:
{$cvText}

Reply ONLY with valid JSON, no markdown:
{
  "ai_summary": "3-4 sentence first-person summary",
  "ai_suggestions": [
    { "section": "summary|experience|education|skills|projects|contact|overall", "advice": "short actionable tip" }
  ],
  "ai_improvements": [
    { "section": "section_name", "current": "the weak line / missing detail", "suggested": "the improved version" }
  ],
  "ai_strength_score": 0
}
PROMPT;

        $raw = $this->callLlm([
            ['role' => 'system', 'content' => 'You are a friendly, expert resume coach. Reply with valid JSON only.'],
            ['role' => 'user',   'content' => $prompt],
        ]);

        if (!$raw) {
            return $this->fallbackSeeker($cv);
        }

        return [
            'ai_summary'        => trim((string) ($raw['ai_summary'] ?? '')) ?: $this->fallbackSeeker($cv)['ai_summary'],
            'ai_suggestions'    => $this->normaliseList($raw['ai_suggestions']  ?? [], ['section', 'advice']),
            'ai_improvements'   => $this->normaliseList($raw['ai_improvements'] ?? [], ['section', 'current', 'suggested']),
            'ai_strength_score' => max(0, min(100, (int) ($raw['ai_strength_score'] ?? 0))),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  EMPLOYER VIEW — short, hiring-focused brief about the candidate
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Return a third-person brief:
     *   - summary           : 2-3 sentence overview
     *   - highlights        : 3-5 standout strengths from the CV
     *   - gaps              : up to 3 things missing / concerns from the CV
     *   - years_experience  : best-guess integer (0 if unknown)
     *   - core_skills       : up to 8 condensed skill tags
     */
    public function generateForEmployer(Cv $cv, ?string $jobContext = null): array
    {
        $cvText  = $this->cvToText($cv);
        $context = $jobContext ? "\nJOB CONTEXT:\n{$jobContext}\n" : '';

        $prompt = <<<PROMPT
You are an objective hiring assistant. Read this applicant's CV and produce a SHORT brief for the employer.
Focus on what matters for a hiring decision: relevant experience, standout achievements, and concerning gaps.
Write in third person ("The candidate…").
{$context}
CV:
{$cvText}

Reply ONLY with valid JSON, no markdown:
{
  "summary": "2-3 sentence neutral overview",
  "highlights": ["short bullet", "short bullet"],
  "gaps": ["short bullet", "short bullet"],
  "years_experience": 0,
  "core_skills": ["skill", "skill"]
}
PROMPT;

        $raw = $this->callLlm([
            ['role' => 'system', 'content' => 'You are a concise, objective recruiter. Reply with valid JSON only.'],
            ['role' => 'user',   'content' => $prompt],
        ]);

        if (!$raw) {
            return $this->fallbackEmployer($cv);
        }

        return [
            'summary'          => trim((string) ($raw['summary'] ?? '')) ?: $this->fallbackEmployer($cv)['summary'],
            'highlights'       => array_values(array_filter($raw['highlights'] ?? [], fn($s) => is_string($s) && $s !== '')),
            'gaps'             => array_values(array_filter($raw['gaps']       ?? [], fn($s) => is_string($s) && $s !== '')),
            'years_experience' => max(0, (int) ($raw['years_experience'] ?? 0)),
            'core_skills'      => array_values(array_filter($raw['core_skills'] ?? [], fn($s) => is_string($s) && $s !== '')),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function cvToText(Cv $cv): string
    {
        $uploadText = $this->extractor->textForCv($cv);

        if ($uploadText !== null) {
            $header = 'UPLOADED CV';
            if ($cv->title) {
                $header .= " ({$cv->title})";
            }

            return "{$header}:\n{$uploadText}";
        }

        $cv->loadMissing(['experiences', 'educations', 'skills', 'projects']);

        $lines = [];
        $lines[] = "NAME: " . ($cv->full_name ?? '(unspecified)');
        if ($cv->location) $lines[] = "LOCATION: {$cv->location}";
        if ($cv->summary)  $lines[] = "EXISTING SUMMARY: {$cv->summary}";

        if ($cv->experiences->count()) {
            $lines[] = "\nEXPERIENCE:";
            foreach ($cv->experiences as $e) {
                $end = $e->is_current ? 'Present' : ($e->end_date ?? '');
                $lines[] = "- {$e->job_title} at {$e->company_name} ({$e->start_date} → {$end})";
                if ($e->description) $lines[] = "  " . str_replace("\n", ' ', $e->description);
            }
        }

        if ($cv->educations->count()) {
            $lines[] = "\nEDUCATION:";
            foreach ($cv->educations as $ed) {
                $end = $ed->is_current ? 'Present' : ($ed->end_date ?? '');
                $lines[] = "- {$ed->degree} in {$ed->field_of_study} — {$ed->institution_name} ({$ed->start_date} → {$end})";
            }
        }

        if ($cv->skills->count()) {
            $lines[] = "\nSKILLS:";
            $lines[] = $cv->skills->map(fn($s) => "{$s->skill_name} ({$s->proficiency_level})")->implode(', ');
        }

        if ($cv->projects->count()) {
            $lines[] = "\nPROJECTS:";
            foreach ($cv->projects as $p) {
                $lines[] = "- {$p->project_name}" . ($p->tech_stack ? " [{$p->tech_stack}]" : '');
                if ($p->description) $lines[] = "  " . str_replace("\n", ' ', $p->description);
            }
        }

        return implode("\n", $lines);
    }

    private function normaliseList(array $items, array $keys): array
    {
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $row = [];
            foreach ($keys as $k) {
                $row[$k] = isset($item[$k]) && is_string($item[$k]) ? trim($item[$k]) : '';
            }
            // require all keys non-empty
            if (!in_array('', $row, true)) {
                $out[] = $row;
            }
        }
        return $out;
    }

    private function callLlm(array $messages): ?array
    {
        if (!$this->configured) return null;

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(45)->post($this->apiUrl, [
                'model'           => $this->model,
                'messages'        => $messages,
                'temperature'     => 0.4,
                'max_tokens'      => 1500,
                'response_format' => ['type' => 'json_object'],
            ]);

            if (!$response->successful()) {
                Log::warning('AiCvSummaryService: LLM non-200', ['status' => $response->status()]);
                return null;
            }

            $content = $response->json('choices.0.message.content');
            $decoded = json_decode($content, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        } catch (\Throwable $e) {
            Log::warning('AiCvSummaryService: HTTP exception — ' . $e->getMessage());
            return null;
        }
    }

    // ─── Fallbacks (when LLM key isn't configured or the call fails) ────────

    private function fallbackSeeker(Cv $cv): array
    {
        $cv->loadMissing(['experiences', 'skills']);
        $role  = optional($cv->experiences->first())->job_title ?? 'professional';
        $years = max(1, $cv->experiences->count());
        $top   = $cv->skills->take(3)->pluck('skill_name')->implode(', ');

        return [
            'ai_summary' => sprintf(
                "I am a %s with %d+ %s of hands-on experience%s. I focus on delivering practical outcomes and continually growing my skill set.",
                $role,
                $years,
                $years === 1 ? 'year' : 'years',
                $top ? ", working primarily with {$top}" : ''
            ),
            'ai_suggestions' => [
                ['section' => 'summary',    'advice' => 'Add a 3-4 sentence summary that highlights your strongest impact metric.'],
                ['section' => 'experience', 'advice' => 'Quantify each role: numbers, scale, and outcomes (e.g. "reduced load time by 35%").'],
                ['section' => 'skills',     'advice' => 'Group skills by category (Languages / Frameworks / Tools) for faster scanning.'],
            ],
            'ai_improvements'   => [],
            'ai_strength_score' => 55,
        ];
    }

    private function fallbackEmployer(Cv $cv): array
    {
        $cv->loadMissing(['experiences', 'skills']);
        $role   = optional($cv->experiences->first())->job_title ?? 'a professional';
        $years  = $cv->experiences->count();
        $skills = $cv->skills->take(6)->pluck('skill_name')->all();

        return [
            'summary'          => "The candidate appears to be {$role} with {$years} listed role(s).",
            'highlights'       => $cv->experiences->take(2)->map(fn($e) => "{$e->job_title} @ {$e->company_name}")->all(),
            'gaps'             => [],
            'years_experience' => $years,
            'core_skills'      => $skills,
        ];
    }
}
