<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class AiMatchingPingCommand extends Command
{
    protected $signature = 'ai:ping';

    protected $description = 'Check connectivity to the AI job-matching service (AI_MATCHING_URL)';

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('services.ai_matching.url'), '/');
        $healthUrl = "{$baseUrl}/health";

        $this->info("AI_MATCHING_URL: {$baseUrl}");

        try {
            $response = Http::connectTimeout(5)->timeout(15)->get($healthUrl);

            if ($response->successful()) {
                $this->info('Health check OK: '.$response->body());

                return self::SUCCESS;
            }

            $this->error("Health check failed (HTTP {$response->status()}): ".$response->body());

            return self::FAILURE;
        } catch (\Throwable $e) {
            $this->error('Could not reach AI service: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
