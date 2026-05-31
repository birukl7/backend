<?php

namespace App\Services;

use App\Models\Cv;
use App\Models\AiMatch;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiMatchingService
{
    private string $baseUrl;

    public function __construct(private CvTextExtractorService $extractor)
    {
        $this->baseUrl = config('services.ai_matching.url', 'http://localhost:8001');
    }

    /**
     * Build a single plain-text blob from all CV sections (builder) or extracted
     * upload content (PDF/DOCX).
     */
    public function buildResumeText(Cv $cv): string
    {
        $uploadText = $this->extractor->textForCv($cv);

        if ($uploadText !== null) {
            $parts = [$uploadText];
            $this->appendVerifiedSkills($cv, $parts);

            return implode('. ', array_filter($parts));
        }

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

        $this->appendVerifiedSkills($cv, $parts);

        return implode('. ', array_filter($parts));
    }

    /** @param list<string> $parts */
    private function appendVerifiedSkills(Cv $cv, array &$parts): void
    {
        // Quiz-verified skills — repeated 3× for higher vector weight in the embedding
        $verifiedSkills = \App\Models\AssessmentResult::where('assessment_results.user_id', $cv->user_id)
            ->where('assessment_results.passed', true)
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
        $vacancies = $this->normalizeVacanciesForApi($vacancies);

        if (empty(trim($resumeText)) || empty($vacancies)) {
            return [];
        }

        $url = rtrim($this->baseUrl, '/').'/match';

        try {
            $response = Http::connectTimeout(5)->timeout(30)->post($url, [
                'resume_text' => $resumeText,
                'vacancies'   => $vacancies,
            ]);

            if ($response->successful()) {
                $matches = $response->json('matches', []);

                return collect($matches)
                    ->mapWithKeys(fn ($match) => [(int) $match['vacancy_id'] => (float) $match['score']])
                    ->toArray();
            }

            Log::warning('AI matching service returned non-200', [
                'url'    => $url,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        } catch (\Exception $e) {
            Log::warning('AI matching service unavailable', [
                'url'   => $url,
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }

    /**
     * Ensure each vacancy satisfies the FastAPI schema (non-empty description).
     *
     * @param  list<array<string, mixed>>  $vacancies
     * @return list<array<string, mixed>>
     */
    private function normalizeVacanciesForApi(array $vacancies): array
    {
        return collect($vacancies)
            ->map(function (array $vacancy): array {
                $title = trim((string) ($vacancy['title'] ?? 'Job'));
                $description = trim((string) ($vacancy['description'] ?? ''));

                if ($description === '') {
                    $description = $title !== '' ? $title : 'Job vacancy';
                }

                return [
                    'id'           => $vacancy['id'],
                    'title'        => $title !== '' ? $title : 'Job',
                    'description'  => $description,
                    'requirements' => filled($vacancy['requirements'] ?? null)
                        ? (string) $vacancy['requirements']
                        : null,
                ];
            })
            ->values()
            ->all();
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
        if (! Cv::where('user_id', $userId)->exists()) {
            AiMatch::where('user_id', $userId)->delete();

            return [];
        }

        $vacancyIds = collect($vacancies)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($vacancyIds === []) {
            return [];
        }

        // ── Serve from cache when every active vacancy has a stored score ─────
        $cached = AiMatch::where('user_id', $userId)
            ->whereIn('vacancy_id', $vacancyIds)
            ->pluck('match_score', 'vacancy_id')
            ->mapWithKeys(fn ($score, $vacancyId) => [(int) $vacancyId => (float) $score])
            ->toArray();

        $missingVacancyIds = array_values(array_diff($vacancyIds, array_keys($cached)));

        if ($missingVacancyIds === [] && $cached !== []) {
            return $cached;
        }

        // ── No (complete) cache — compute scores for missing or all vacancies ─
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

        if (trim($resumeText) === '') {
            Log::info('AI matching skipped: CV has no extractable text for scoring', [
                'user_id' => $userId,
                'cv_id'   => $cv->id,
            ]);

            return $cached;
        }

        $vacanciesToScore = $missingVacancyIds === []
            ? $vacancies
            : collect($vacancies)
                ->whereIn('id', $missingVacancyIds)
                ->values()
                ->all();

        $scoreMap = $this->getMatchScores($resumeText, $vacanciesToScore);

        if (! empty($scoreMap)) {
            $this->storeMatches($userId, $scoreMap);
        }

        return array_replace($cached, $scoreMap);
    }
}
