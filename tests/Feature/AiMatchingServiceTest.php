<?php

use App\Models\AiMatch;
use App\Models\Cv;
use App\Models\User;
use App\Models\Vacancy;
use App\Services\AiMatchingService;
use Illuminate\Support\Facades\Http;

test('match scores are fetched from the configured AI service URL', function () {
    config(['services.ai_matching.url' => 'http://ai.example.test']);

    $user = User::factory()->create();

    Cv::create([
        'user_id'    => $user->id,
        'title'      => 'My CV',
        'is_default' => true,
        'summary'    => 'Experienced Laravel developer',
    ]);

    $employer = User::factory()->create();

    $vacancy = Vacancy::create([
        'user_id'              => $employer->id,
        'title'                => 'Backend Developer',
        'description'          => 'Build APIs with Laravel',
        'application_deadline' => now()->addMonth(),
    ]);

    Http::fake([
        'http://ai.example.test/match' => Http::response([
            'matches' => [
                ['vacancy_id' => $vacancy->id, 'score' => 0.82],
            ],
        ]),
    ]);

    $scores = app(AiMatchingService::class)->matchForUser($user->id, [
        [
            'id'           => $vacancy->id,
            'title'        => $vacancy->title,
            'description'  => $vacancy->description,
            'requirements' => $vacancy->requirements,
        ],
    ]);

    expect($scores)->toBe([(int) $vacancy->id => 0.82]);
    expect(AiMatch::where('user_id', $user->id)->value('match_score'))->toBe(0.82);

    Http::assertSent(fn ($request) => $request->url() === 'http://ai.example.test/match'
        && $request['resume_text'] !== '');
});

test('match scores use cv title fallback when sections are empty', function () {
    config(['services.ai_matching.url' => 'http://ai.example.test']);

    $user = User::factory()->create();

    Cv::create([
        'user_id'    => $user->id,
        'title'      => 'Product Designer',
        'is_default' => true,
    ]);

    $employer = User::factory()->create();

    $vacancy = Vacancy::create([
        'user_id'              => $employer->id,
        'title'                => 'UX Designer',
        'description'          => 'Design product interfaces',
        'application_deadline' => now()->addMonth(),
    ]);

    Http::fake([
        'http://ai.example.test/match' => Http::response([
            'matches' => [
                ['vacancy_id' => $vacancy->id, 'score' => 0.55],
            ],
        ]),
    ]);

    $scores = app(AiMatchingService::class)->matchForUser($user->id, [
        [
            'id'          => $vacancy->id,
            'title'       => $vacancy->title,
            'description' => $vacancy->description,
        ],
    ]);

    expect($scores)->toBe([(int) $vacancy->id => 0.55]);
    Http::assertSent(fn ($request) => str_contains($request['resume_text'], 'Product Designer'));
});

test('match scores return empty when user has no cv', function () {
    $user = User::factory()->create();
    $employer = User::factory()->create();

    $vacancy = Vacancy::create([
        'user_id'              => $employer->id,
        'title'                => 'Designer',
        'description'          => 'UI design role',
        'application_deadline' => now()->addMonth(),
    ]);

    Http::fake();

    $scores = app(AiMatchingService::class)->matchForUser($user->id, [
        [
            'id'          => $vacancy->id,
            'title'       => $vacancy->title,
            'description' => $vacancy->description,
        ],
    ]);

    expect($scores)->toBe([]);
    Http::assertNothingSent();
});
