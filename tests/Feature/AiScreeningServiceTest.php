<?php

use App\Models\JobScreening;
use App\Models\ScreeningResponse;
use App\Services\AiScreeningService;

function invokeScreeningMethod(object $service, string $method, array $args = []): mixed
{
    $reflection = new ReflectionMethod($service, $method);
    $reflection->setAccessible(true);

    return $reflection->invoke($service, ...$args);
}

function makeScreeningResponse(array $transcript): ScreeningResponse
{
    $response             = new ScreeningResponse;
    $response->transcript = $transcript;

    return $response;
}

function sampleScreeningQuestions(): array
{
    return [
        ['id' => 'q1', 'text' => 'Describe prioritizing competing features.', 'required' => true],
        ['id' => 'q2', 'text' => 'Do you have experience with MoSCoW or Kano?', 'required' => true],
        ['id' => 'q3', 'text' => 'What metrics do you use for product features?', 'required' => true],
    ];
}

test('next unasked question skips already covered ids', function () {
    $service = app(AiScreeningService::class);

    $next = invokeScreeningMethod($service, 'nextUnaskedQuestion', [
        sampleScreeningQuestions(),
        ['q1', 'q2'],
    ]);

    expect($next['id'] ?? null)->toBe('q3');
});

test('turn progress allows only one follow-up per question', function () {
    $service = app(AiScreeningService::class);

    $afterFirstAnswer = [
        ['role' => 'ai', 'text' => 'Question 1?', 'qid' => 'q1'],
        ['role' => 'user', 'text' => 'nothing'],
    ];

    expect(invokeScreeningMethod($service, 'resolveTurnProgress', [$afterFirstAnswer, sampleScreeningQuestions()]))
        ->toMatchArray(['type' => 'follow_up', 'qid' => 'q1']);

    $afterFollowUpAnswer = [
        ['role' => 'ai', 'text' => 'Question 1?', 'qid' => 'q1'],
        ['role' => 'user', 'text' => 'nothing'],
        ['role' => 'ai', 'text' => 'Can you elaborate?', 'qid' => null],
        ['role' => 'user', 'text' => 'still nothing'],
    ];

    expect(invokeScreeningMethod($service, 'resolveTurnProgress', [$afterFollowUpAnswer, sampleScreeningQuestions()]))
        ->toMatchArray(['type' => 'next_question']);
});

test('normalise chat reply replaces repeated list questions with the next unasked one', function () {
    $service = app(AiScreeningService::class);

    $screening            = new JobScreening;
    $screening->questions = sampleScreeningQuestions();

    $response = makeScreeningResponse([
        ['role' => 'ai', 'text' => 'Describe prioritizing competing features?', 'qid' => 'q1'],
        ['role' => 'user', 'text' => 'nothing'],
        ['role' => 'ai', 'text' => 'Can you elaborate?', 'qid' => null],
        ['role' => 'user', 'text' => 'no'],
        ['role' => 'ai', 'text' => 'Do you have experience with MoSCoW or Kano?', 'qid' => 'q2'],
        ['role' => 'user', 'text' => 'no experience'],
    ]);

    $normalised = invokeScreeningMethod($service, 'normaliseChatReply', [
        $response,
        $screening,
        [
            'reply'            => 'Thanks for sharing. Do you have experience with MoSCoW or Kano?',
            'done'             => false,
            'next_question_id' => 'q2',
        ],
    ]);

    expect($normalised['next_question_id'])->toBe('q3')
        ->and($normalised['reply'])->toContain('What metrics do you use for product features?')
        ->and($normalised['reply'])->not->toContain('MoSCoW');
});
