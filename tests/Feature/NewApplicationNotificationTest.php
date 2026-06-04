<?php

use App\Models\AppNotification;
use App\Models\Cv;
use App\Models\User;
use App\Models\Vacancy;
use App\Notifications\NewApplicationNotification;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['employer', 'job_seeker'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }
});

test('employer receives in-app and email notification when a job is applied to', function () {
    Notification::fake();

    $employer = User::factory()->create();
    $employer->assignRole('employer');

    $jobSeeker = User::factory()->create();
    $jobSeeker->assignRole('job_seeker');

    $vacancy = Vacancy::factory()->create(['user_id' => $employer->id]);

    $cv = Cv::create([
        'user_id' => $jobSeeker->id,
        'title' => 'Main CV',
        'summary' => 'Experienced software engineer.',
    ]);

    $this->actingAs($jobSeeker)
        ->post(route('applications.store'), [
            'vacancy_id' => $vacancy->id,
            'cv_id' => $cv->id,
        ])
        ->assertRedirect();

    Notification::assertSentTo($employer, NewApplicationNotification::class);

    $notification = AppNotification::where('user_id', $employer->id)
        ->where('type', 'new_application')
        ->first();

    expect($notification)->not->toBeNull()
        ->and($notification->title)->toBe('New application received')
        ->and($notification->body)->toContain($jobSeeker->name)
        ->and($notification->body)->toContain($vacancy->title)
        ->and($notification->data)->toMatchArray([
            'vacancy_id' => $vacancy->id,
        ]);
});
