<?php

namespace App\Support;

/**
 * @phpstan-type AiMatchingDebug array{
 *     status: 'guest'|'no_cv'|'empty_cv'|'no_vacancies'|'service_unreachable'|'service_error'|'ok'|'cached',
 *     message: string,
 *     ai_matching_url: string,
 *     cv_id?: int|null,
 *     cv_title?: string|null,
 *     resume_text_length?: int,
 *     vacancy_count?: int,
 *     scores_count?: int,
 *     sample_scores?: array<int, float>,
 *     service_health?: string|null,
 *     http_status?: int|null,
 * }
 */
class AiMatchingDiagnostic
{
    /**
     * @param  AiMatchingDebug  $data
     */
    public static function message(array $data): string
    {
        return $data['message'];
    }
}
