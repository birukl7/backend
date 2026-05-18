<?php

namespace App\Services;

use App\Models\Cv;
use App\Models\AiMatch;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiMatchingService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.ai_matching.url', 'http://localhost:8001');
    }

    /**
     * Build a single plain-text blob from all CV sections.
     */
    public function buildResumeText(Cv $cv): string
    {
        $parts = [];

        if ($cv->summary) {
            $parts[] = $cv->summary;
        }

        foreach ($cv->skills as $skill) {
            $line = $skill->skill_name;
            if ($skill->category) $line .= " ({$skill->category})";
            if ($skill->proficiency_level) $line .= " - {$skill->proficiency_level}";
            $parts[] = $line;
        }

        foreach ($cv->experiences as $exp) {
            $parts[] = "{$exp->job_title} at {$exp->company_name}";
            if ($exp->description) $parts[] = $exp->description;
        }

        foreach ($cv->educations as $edu) {
            $line = "{$edu->degree} in {$edu->field_of_study} at {$edu->institution_name}";
            if ($edu->description) $line .= ". {$edu->description}";
            $parts[] = $line;
        }

        foreach ($cv->projects as $proj) {
            $parts[] = $proj->project_name;
            if ($proj->description) $parts[] = $proj->description;
            if ($proj->tech_stack) $parts[] = $proj->tech_stack;
        }

        // Quiz-verified skills — repeated 3× for higher vector weight in the embedding
        $verifiedSkills = \App\Models\AssessmentResult::where('user_id', $cv->user_id)
            ->where('passed', true)
            ->join('assessments', 'assessment_results.assessment_id', '=', 'assessments.id')
            ->select('assessments.skill_name', 'assessments.category', 'assessment_results.level', 'assessment_results.score')
            ->orderByDesc('assessment_results.score')
            ->get()
            ->unique('skill_name');

        foreach ($verifiedSkills as $vs) {
            if (!$vs->skill_name) continue;
            $parts[] = "Certified {$vs->skill_name} ({$vs->level} level, verified score: {$vs->score}%)";
            $parts[] = "{$vs->skill_name} verified skill certificate";
            $parts[] = "{$vs->category} certified: {$vs->skill_name}";
        }

        return implode('. ', array_filter($parts));
    }

    /**
     * Call the FastAPI AI service and return match scores.
     * Returns array keyed by vacancy_id => score (0.0 – 1.0)
     *
     * Intentionally short timeouts (connect: 2 s, read: 10 s) so a downed
     * service fails fast instead of blocking the page for 30 seconds.
     */
    public function getMatchScores(string $resumeText, array $vacancies): array
    {
        if (empty($resumeText) || empty($vacancies)) {
            return [];
        }

        try {
            $response = Http::connectTimeout(2)->timeout(10)->post("{$this->baseUrl}/match", [
                'resume_text' => $resumeText,
                'vacancies'   => $vacancies,
            ]);

            if ($response->successful()) {
                $matches = $response->json('matches', []);
                return collect($matches)
                    ->pluck('score', 'vacancy_id')
                    ->toArray();
            }

            Log::warning('AI matching service returned non-200', ['status' => $response->status()]);
        } catch (\Exception $e) {
            Log::info('AI matching service unavailable (will use cache): ' . $e->getMessage());
        }

        return [];
    }

    /**
     * Persist scores to ai_matches table (upsert).
     */
    public function storeMatches(int $userId, array $scoreMap): void
    {
        foreach ($scoreMap as $vacancyId => $score) {
            AiMatch::updateOrCreate(
                ['user_id' => $userId, 'vacancy_id' => $vacancyId],
                ['match_score' => $score]
            );
        }
    }

    /**
     * Full pipeline: load CV → build text → call FastAPI → return score map.
     *
     * PERFORMANCE: Returns cached scores from the ai_matches table instantly.
     * Only calls the FastAPI service when no cache exists (first visit or after
     * a quiz pass which deletes the cache in QuizController::submit).
     */
    public function matchForUser(int $userId, array $vacancies): array
    {
        // ── Serve from cache when available (instant, zero network cost) ──────
        $cached = AiMatch::where('user_id', $userId)
            ->pluck('match_score', 'vacancy_id')
            ->toArray();

        if (!empty($cached)) {
            return $cached;
        }

        // ── No cache — compute fresh scores ───────────────────────────────────
        $cv = Cv::where('user_id', $userId)
            ->where('is_default', true)
            ->with(['skills', 'experiences', 'educations', 'projects'])
            ->first()
            ?? Cv::where('user_id', $userId)
                ->with(['skills', 'experiences', 'educations', 'projects'])
                ->first();

        if (!$cv) {
            return [];
        }

        $resumeText = $this->buildResumeText($cv);
        $scoreMap   = $this->getMatchScores($resumeText, $vacancies);

        if (!empty($scoreMap)) {
            $this->storeMatches($userId, $scoreMap);
        }

        return $scoreMap;
    }
}
