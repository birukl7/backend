<?php

use App\Support\VacancyMatchPresenter;

test('forInertia encodes vacancy ids as string object keys', function () {
    $payload = VacancyMatchPresenter::forInertia([
        5 => 0.82,
        12 => 0.41,
    ]);

    $json = json_encode($payload);

    expect($json)->toBe('{"5":0.82,"12":0.41}');
});

test('attach sets match_score on each vacancy model', function () {
    $vacancies = collect([
        (object) ['id' => 1, 'title' => 'A'],
        (object) ['id' => 2, 'title' => 'B'],
    ]);

    $result = VacancyMatchPresenter::attach($vacancies, [1 => 0.9]);

    expect($result[0]->match_score)->toBe(0.9);
    expect($result[1]->match_score)->toBeNull();
});
