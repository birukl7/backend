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

        $text = implode('. ', array_filter($parts));

        if (trim($text) !== '') {
            return $text;
        }

        return $this->buildResumeFallback($cv);
    }

    /**
     * Minimum text when the CV shell exists but sections are empty (still allows scoring).
     */
    private function buildResumeFallback(Cv $cv): string
    {
        $cv->loadMissing('user:id,name,headline,bio');

        return implode('. ', array_filter([
            $cv->title ? "Professional profile: {$cv->title}" : null,
            $cv->full_name,
            $cv->location,
            $cv->user?->headline,
            $cv->user?->bio,
        ]));
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
            ->with(['skills', 'experiences', 'educations', 'projects', 'user:id,name,headline,bio'])
            ->first()
            ?? Cv::where('user_id', $userId)
                ->with(['skills', 'experiences', 'educations', 'projects', 'user:id,name,headline,bio'])
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

    /**
     * Human-readable hint for the job board when match badges cannot be shown.
     */
    public function hintForUser(int $userId): ?string
    {
        if (! Cv::where('user_id', $userId)->exists()) {
            return 'Create a CV to see AI match scores on jobs.';
        }

        $cv = Cv::where('user_id', $userId)
            ->with(['skills', 'experiences', 'educations', 'projects', 'user:id,name,headline,bio'])
            ->orderByDesc('is_default')
            ->first();

        if ($cv && trim($this->buildResumeText($cv)) === '') {
            return 'Add a summary, skills, or experience to your CV to enable AI match scores.';
        }

        return null;
    }

    /**
     * Detailed diagnostics (APP_DEBUG, artisan ai:debug-match).
     *
     * @param  list<array<string, mixed>>  $vacancies
     * @return array<string, mixed>
     */
    public function diagnose(int $userId, array $vacancies = []): array
    {
        $base = [
            'status'          => 'ok',
            'message'         => 'AI matching is configured and scores are available.',
            'ai_matching_url' => $this->baseUrl,
            'user_id'         => $userId,
        ];

        try {
            $health = Http::connectTimeout(3)->timeout(8)->get(rtrim($this->baseUrl, '/').'/health');
            $base['service_health'] = $health->successful() ? $health->body() : null;
            $base['http_status']    = $health->status();

            if (! $health->successful()) {
                return array_merge($base, [
                    'status'  => 'service_unreachable',
                    'message' => "AI service health check failed (HTTP {$health->status()}). Check AI_MATCHING_URL and EC2 security group port 8001.",
                ]);
            }
        } catch (\Throwable $e) {
            return array_merge($base, [
                'status'  => 'service_unreachable',
                'message' => 'Cannot reach AI service: '.$e->getMessage(),
            ]);
        }

        $cvCount = Cv::where('user_id', $userId)->count();

        if ($cvCount === 0) {
            return array_merge($base, [
                'status'  => 'no_cv',
                'message' => 'User has no CV. Matching only runs for users with at least one CV.',
            ]);
        }

        $cv = Cv::where('user_id', $userId)
            ->with(['skills', 'experiences', 'educations', 'projects', 'user:id,name,headline,bio'])
            ->orderByDesc('is_default')
            ->first();

        $resumeText = $cv ? $this->buildResumeText($cv) : '';
        $resumeLen  = strlen(trim($resumeText));

        $base['cv_id']               = $cv?->id;
        $base['cv_title']            = $cv?->title;
        $base['cv_is_default']       = (bool) $cv?->is_default;
        $base['cv_skills_count']     = $cv?->skills->count() ?? 0;
        $base['cv_experiences_count'] = $cv?->experiences->count() ?? 0;
        $base['resume_text_length']  = $resumeLen;
        $base['resume_preview']      = $resumeLen > 0 ? mb_substr($resumeText, 0, 120).'…' : null;

        if ($resumeLen === 0) {
            return array_merge($base, [
                'status'  => 'empty_cv',
                'message' => 'CV exists but resume text is empty. Add summary, skills, experience, or upload a PDF/DOCX.',
            ]);
        }

        if ($vacancies === []) {
            $vacancies = \App\Models\Vacancy::active()
                ->limit(3)
                ->get(['id', 'title', 'description', 'requirements'])
                ->map(fn ($v) => [
                    'id'           => $v->id,
                    'title'        => $v->title,
                    'description'  => $v->description,
                    'requirements' => $v->requirements,
                ])
                ->all();
        }

        $base['vacancy_count'] = count($vacancies);

        if ($vacancies === []) {
            return array_merge($base, [
                'status'  => 'no_vacancies',
                'message' => 'No active vacancies to score against.',
            ]);
        }

        $scores = $this->matchForUser($userId, $vacancies);
        $base['scores_count']   = count($scores);
        $base['sample_scores']  = array_slice($scores, 0, 5, true);
        $base['cached_in_db']   = AiMatch::where('user_id', $userId)->count();

        if ($scores === []) {
            return array_merge($base, [
                'status'  => 'service_error',
                'message' => 'Resume text is present but POST /match returned no scores. Check storage/logs/laravel.log.',
            ]);
        }

        return array_merge($base, [
            'status'  => 'ok',
            'message' => 'Matching works. '.count($scores).' score(s) returned.',
        ]);
    }
}
