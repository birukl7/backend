<?php

namespace App\Support;

use Illuminate\Support\Collection;

class VacancyMatchPresenter
{
    /**
     * Attach match_score (0.0–1.0) to each vacancy for the job board UI.
     *
     * @param  \Illuminate\Support\Collection<int, object>  $vacancies
     * @param  array<int, float>  $scores
     * @return \Illuminate\Support\Collection<int, object>
     */
    public static function attach(Collection $vacancies, array $scores): Collection
    {
        return $vacancies->map(function (object $vacancy) use ($scores): object {
            $vacancy->match_score = $scores[(int) $vacancy->id] ?? null;

            return $vacancy;
        });
    }

    /**
     * Format scores for Inertia/JSON so vacancy IDs stay object keys (not a JSON array).
     *
     * @param  array<int, float>  $scores
     */
    public static function forInertia(array $scores): object
    {
        $mapped = [];

        foreach ($scores as $vacancyId => $score) {
            $mapped[(string) $vacancyId] = $score;
        }

        return (object) $mapped;
    }
}
