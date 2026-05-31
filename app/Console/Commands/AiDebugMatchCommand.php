<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AiMatchingService;
use Illuminate\Console\Command;

class AiDebugMatchCommand extends Command
{
    protected $signature = 'ai:debug-match {user? : User ID or email}';

    protected $description = 'Diagnose why AI job match scores are missing for a user';

    public function handle(AiMatchingService $aiService): int
    {
        $user = $this->resolveUser($this->argument('user'));

        if ($user === null) {
            $this->error('User not found. Pass a user id or email.');

            return self::FAILURE;
        }

        $this->info("Diagnosing AI matching for user #{$user->id} ({$user->email})");
        $this->newLine();

        $report = $aiService->diagnose($user->id);

        foreach ($report as $key => $value) {
            if (is_array($value)) {
                $this->line("<fg=cyan>{$key}</>: ".json_encode($value, JSON_UNESCAPED_SLASHES));
            } else {
                $this->line("<fg=cyan>{$key}</>: {$value}");
            }
        }

        $this->newLine();
        $status = $report['status'] ?? 'unknown';

        if ($status === 'ok') {
            $this->info($report['message']);

            return self::SUCCESS;
        }

        $this->warn($report['message']);

        return self::FAILURE;
    }

    private function resolveUser(?string $identifier): ?User
    {
        if ($identifier === null || $identifier === '') {
            return User::query()->orderBy('id')->first();
        }

        if (is_numeric($identifier)) {
            return User::find((int) $identifier);
        }

        return User::where('email', $identifier)->first();
    }
}
