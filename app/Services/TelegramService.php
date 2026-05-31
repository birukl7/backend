<?php

namespace App\Services;

use App\Models\Vacancy;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private string $serviceUrl;

    public function __construct()
    {
        $this->serviceUrl = rtrim(config('services.telegram.service_url', ''), '/');
    }

    /**
     * Notify the Telegram channel about a newly posted vacancy.
     * Failures are logged and swallowed so they never block job creation.
     */
    public function notifyNewJob(Vacancy $vacancy): void
    {
        if (empty($this->serviceUrl)) {
            Log::debug('TelegramService: TELEGRAM_SERVICE_URL not configured – skipping notification.');
            return;
        }

        $payload = $this->buildPayload($vacancy);

        try {
            $response = Http::timeout(10)
                ->post("{$this->serviceUrl}/send-job", $payload);

            if ($response->failed()) {
                Log::warning('TelegramService: send-job returned non-2xx', [
                    'status'     => $response->status(),
                    'body'       => $response->body(),
                    'vacancy_id' => $vacancy->id,
                ]);
            } else {
                Log::info('TelegramService: job posted to channel', [
                    'vacancy_id' => $vacancy->id,
                    'message_id' => $response->json('message_id'),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('TelegramService: failed to reach telegram_service', [
                'error'      => $e->getMessage(),
                'vacancy_id' => $vacancy->id,
            ]);
        }
    }

    private function buildPayload(Vacancy $vacancy): array
    {
        $employer = $vacancy->employer ?? $vacancy->user;

        return [
            'vacancy_id'           => $vacancy->id,
            'title'                => $vacancy->title,
            'company_name'         => $employer?->company_name ?? $employer?->name,
            'location'             => $vacancy->location,
            'employment_type'      => $vacancy->employment_type,
            'work_type'            => $vacancy->work_type,
            'salary_min'           => $vacancy->salary_min,
            'salary_max'           => $vacancy->salary_max,
            'description'          => $vacancy->description,
            'tags'                 => $vacancy->tags ?? [],
            'application_deadline' => $vacancy->application_deadline
                ? $vacancy->application_deadline->format('M d, Y')
                : null,
        ];
    }
}
