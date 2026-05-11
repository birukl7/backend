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

        return implode('. ', array_filter($parts));
    }

    /**
     * Call the FastAPI AI service and return match scores.
     * Returns array keyed by vacancy_id => score (0.0 – 1.0)
     */
    public function getMatchScores(string $resumeText, array $vacancies): array
    {
        if (empty($resumeText) || empty($vacancies)) {
            return [];
        }

        try {
            $response = Http::timeout(30)->post("{$this->baseUrl}/match", [
                'resume_text' => $resumeText,
                'vacancies'   => $vacancies,
            ]);

            if ($response->successful()) {
                $matches = $response->json('matches', []);
                // Convert to vacancy_id => score map
                return collect($matches)
                    ->pluck('score', 'vacancy_id')
                    ->toArray();
            }

            Log::warning('AI matching service returned non-200', [
                'status' => $response->status(),
            ]);
        } catch (\Exception $e) {
            Log::warning('AI matching service unavailable: ' . $e->getMessage());
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
     */
    public function matchForUser(int $userId, array $vacancies): array
    {
        $cv = Cv::where('user_id', $userId)
            ->where('is_default', true)
            ->with(['skills', 'experiences', 'educations', 'projects'])
            ->first();

        if (!$cv) {
            // Fall back to any CV
            $cv = Cv::where('user_id', $userId)
                ->with(['skills', 'experiences', 'educations', 'projects'])
                ->first();
        }

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
