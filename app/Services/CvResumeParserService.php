<?php

namespace App\Services;

use App\Models\AiMatch;
use App\Models\Cv;
use App\Models\CvEducation;
use App\Models\CvExperience;
use App\Models\CvProject;
use App\Models\CvSkill;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CvResumeParserService
{
    private string $apiKey;

    private string $apiUrl;

    private string $model;

    private bool $configured;

    public function __construct(private CvTextExtractorService $extractor)
    {
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

    /**
     * Parse uploaded resume text into structured CV sections for AI matching, quizzes, etc.
     */
    public function parseAndPersist(Cv $cv): bool
    {
        if (! $cv->isUpload()) {
            return false;
        }

        $text = $this->extractor->textForCv($cv);

        if (! filled($text)) {
            return false;
        }

        if (! $this->configured) {
            Log::info('CvResumeParserService: skipped — no LLM API key configured');

            return false;
        }

        $data = $this->callLlm($text);

        if (! $data) {
            return false;
        }

        DB::transaction(function () use ($cv, $data) {
            $cv->experiences()->delete();
            $cv->educations()->delete();
            $cv->skills()->delete();
            $cv->projects()->delete();

            $cv->update(array_filter([
                'full_name' => $this->stringOrNull($data['full_name'] ?? null),
                'email'     => $this->stringOrNull($data['email'] ?? null),
                'phone'     => $this->stringOrNull($data['phone'] ?? null),
                'location'  => $this->stringOrNull($data['location'] ?? null),
                'website'   => $this->stringOrNull($data['website'] ?? null),
                'linkedin'  => $this->stringOrNull($data['linkedin'] ?? null),
                'github'    => $this->stringOrNull($data['github'] ?? null),
                'summary'   => $this->stringOrNull($data['summary'] ?? null),
            ], fn ($v) => $v !== null));

            foreach ($data['experiences'] ?? [] as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $jobTitle = $this->stringOrNull($row['job_title'] ?? null);
                $company  = $this->stringOrNull($row['company_name'] ?? null);

                if (! $jobTitle || ! $company) {
                    continue;
                }

                CvExperience::create([
                    'cv_id'        => $cv->id,
                    'job_title'    => mb_substr($jobTitle, 0, 120),
                    'company_name' => mb_substr($company, 0, 120),
                    'location'     => $this->truncate($row['location'] ?? null, 120),
                    'description'  => $this->stringOrNull($row['description'] ?? null),
                    'start_date'   => $this->parseDate($row['start_date'] ?? null, '2020-01-01'),
                    'end_date'     => ($row['is_current'] ?? false) ? null : $this->parseDate($row['end_date'] ?? null, null),
                    'is_current'   => (bool) ($row['is_current'] ?? false),
                    'sort_order'   => $i,
                ]);
            }

            foreach ($data['educations'] ?? [] as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $institution = $this->stringOrNull($row['institution_name'] ?? null);
                $degree      = $this->stringOrNull($row['degree'] ?? null);
                $field       = $this->stringOrNull($row['field_of_study'] ?? null);

                if (! $institution || ! $degree || ! $field) {
                    continue;
                }

                CvEducation::create([
                    'cv_id'            => $cv->id,
                    'institution_name' => mb_substr($institution, 0, 120),
                    'degree'           => mb_substr($degree, 0, 120),
                    'field_of_study'   => mb_substr($field, 0, 120),
                    'location'         => $this->truncate($row['location'] ?? null, 120),
                    'description'      => $this->stringOrNull($row['description'] ?? null),
                    'start_date'       => $this->parseDate($row['start_date'] ?? null, '2015-01-01'),
                    'end_date'         => ($row['is_current'] ?? false) ? null : $this->parseDate($row['end_date'] ?? null, null),
                    'is_current'       => (bool) ($row['is_current'] ?? false),
                    'sort_order'       => $i,
                ]);
            }

            foreach ($data['skills'] ?? [] as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $name = $this->stringOrNull($row['skill_name'] ?? null);

                if (! $name) {
                    continue;
                }

                CvSkill::create([
                    'cv_id'             => $cv->id,
                    'skill_name'        => mb_substr($name, 0, 80),
                    'proficiency_level' => $this->normaliseProficiency($row['proficiency_level'] ?? null),
                    'category'          => $this->truncate($row['category'] ?? null, 80),
                    'sort_order'        => $i,
                ]);
            }

            foreach ($data['projects'] ?? [] as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $name = $this->stringOrNull($row['project_name'] ?? null);

                if (! $name) {
                    continue;
                }

                CvProject::create([
                    'cv_id'        => $cv->id,
                    'project_name' => mb_substr($name, 0, 120),
                    'description'  => $this->stringOrNull($row['description'] ?? null),
                    'url'          => $this->truncate($row['url'] ?? null, 255),
                    'tech_stack'   => $this->truncate($row['tech_stack'] ?? null, 255),
                    'start_date'   => $this->parseDate($row['start_date'] ?? null, null),
                    'end_date'     => $this->parseDate($row['end_date'] ?? null, null),
                    'sort_order'   => $i,
                ]);
            }

            $cv->markContentChanged();
        });

        AiMatch::where('user_id', $cv->user_id)->delete();

        return true;
    }

    private function callLlm(string $resumeText): ?array
    {
        $resumeText = mb_substr($resumeText, 0, 14000);

        $prompt = <<<PROMPT
Extract structured data from this resume/CV. Use only information present in the text; do not invent employers, degrees, or skills.

RESUME:
{$resumeText}

Return ONLY valid JSON:
{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "website": "string or null",
  "linkedin": "string or null",
  "github": "string or null",
  "summary": "2-4 sentence professional summary or null",
  "skills": [
    { "skill_name": "string", "proficiency_level": "beginner|intermediate|advanced|expert", "category": "backend|frontend|database|general or null" }
  ],
  "experiences": [
    {
      "job_title": "string",
      "company_name": "string",
      "location": "string or null",
      "description": "string or null",
      "start_date": "YYYY-MM-DD or YYYY-MM or YYYY",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false
    }
  ],
  "educations": [
    {
      "institution_name": "string",
      "degree": "string",
      "field_of_study": "string",
      "location": "string or null",
      "description": "string or null",
      "start_date": "YYYY-MM-DD or YYYY",
      "end_date": "YYYY-MM-DD or null",
      "is_current": false
    }
  ],
  "projects": [
    {
      "project_name": "string",
      "description": "string or null",
      "url": "string or null",
      "tech_stack": "comma-separated technologies or null",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null"
    }
  ]
}
PROMPT;

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(60)->post($this->apiUrl, [
                'model'           => $this->model,
                'messages'        => [
                    ['role' => 'system', 'content' => 'You extract resume data accurately. Reply with valid JSON only.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature'     => 0.2,
                'max_tokens'      => 4000,
                'response_format' => ['type' => 'json_object'],
            ]);

            if (! $response->successful()) {
                Log::warning('CvResumeParserService: LLM non-200', ['status' => $response->status()]);

                return null;
            }

            $content = $response->json('choices.0.message.content');
            $decoded = json_decode($content, true);

            return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        } catch (\Throwable $e) {
            Log::warning('CvResumeParserService: HTTP exception — '.$e->getMessage());

            return null;
        }
    }

    private function stringOrNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value !== '' ? $value : null;
    }

    private function truncate(mixed $value, int $max): ?string
    {
        $s = $this->stringOrNull($value);

        return $s !== null ? mb_substr($s, 0, $max) : null;
    }

    private function normaliseProficiency(?string $level): string
    {
        $level = strtolower(trim((string) $level));

        return match ($level) {
            'beginner', 'intermediate', 'advanced', 'expert' => $level,
            default => 'intermediate',
        };
    }

    private function parseDate(mixed $value, ?string $fallback): ?string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        if (! is_string($value)) {
            return $fallback;
        }

        $value = trim($value);

        if ($value === '' || strtolower($value) === 'present') {
            return $fallback;
        }

        try {
            if (preg_match('/^\d{4}$/', $value)) {
                return Carbon::createFromDate((int) $value, 1, 1)->format('Y-m-d');
            }

            if (preg_match('/^\d{4}-\d{2}$/', $value)) {
                return Carbon::createFromFormat('Y-m', $value)->startOfMonth()->format('Y-m-d');
            }

            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
