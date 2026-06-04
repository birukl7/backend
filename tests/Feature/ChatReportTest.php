<?php

use App\Models\AppNotification;
use App\Models\ChatReport;
use App\Models\Conversation;
use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    foreach (['admin', 'employer', 'job_seeker'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }
});

function createChatConversation(): array
{
    $employer = User::factory()->create();
    $employer->assignRole('employer');

    $jobSeeker = User::factory()->create();
    $jobSeeker->assignRole('job_seeker');

    $conversation = Conversation::create([
        'employer_id'   => $employer->id,
        'job_seeker_id' => $jobSeeker->id,
        'status'        => 'active',
    ]);

    return compact('employer', 'jobSeeker', 'conversation');
}

test('job seeker can report employer for scam in chat', function () {
    ['employer' => $employer, 'jobSeeker' => $jobSeeker, 'conversation' => $conversation] = createChatConversation();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $response = $this->actingAs($jobSeeker)
        ->postJson(route('chat.report', $conversation), [
            'category' => 'scam',
            'reason'   => 'They asked me to pay a fee before starting work.',
        ]);

    $response->assertOk()
        ->assertJsonPath('ok', true);

    $report = ChatReport::first();
    expect($report)->not->toBeNull();
    expect($report->reporter_id)->toBe($jobSeeker->id);
    expect($report->reported_user_id)->toBe($employer->id);
    expect($report->category)->toBe('scam');
    expect($report->status)->toBe('pending');

    expect(AppNotification::where('type', 'chat_report')->count())->toBe(1);
});

test('employer can report job seeker for insult in chat', function () {
    ['employer' => $employer, 'jobSeeker' => $jobSeeker, 'conversation' => $conversation] = createChatConversation();

    User::factory()->create()->assignRole('admin');

    $this->actingAs($employer)
        ->postJson(route('chat.report', $conversation), [
            'category' => 'insult',
            'reason'   => 'Sent abusive and threatening messages in this chat.',
        ])
        ->assertOk();

    expect(ChatReport::first()->reported_user_id)->toBe($jobSeeker->id);
});

test('user cannot report conversation they are not part of', function () {
    ['conversation' => $conversation] = createChatConversation();

    $other = User::factory()->create();
    $other->assignRole('job_seeker');

    $this->actingAs($other)
        ->postJson(route('chat.report', $conversation), [
            'category' => 'other',
            'reason'   => 'Trying to report someone else conversation.',
        ])
        ->assertForbidden();
});

test('duplicate pending report for same conversation is rejected', function () {
    ['employer' => $employer, 'conversation' => $conversation] = createChatConversation();

    ChatReport::create([
        'reporter_id'      => $employer->id,
        'reported_user_id' => $conversation->job_seeker_id,
        'conversation_id'  => $conversation->id,
        'category'         => 'scam',
        'reason'           => 'Existing pending report.',
        'status'           => 'pending',
    ]);

    $this->actingAs($employer)
        ->postJson(route('chat.report', $conversation), [
            'category' => 'insult',
            'reason'   => 'Another attempt to report the same conversation.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('reason');
});

test('admin can list and process chat reports', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    ['employer' => $employer, 'jobSeeker' => $jobSeeker, 'conversation' => $conversation] = createChatConversation();

    $report = ChatReport::create([
        'reporter_id'      => $jobSeeker->id,
        'reported_user_id' => $employer->id,
        'conversation_id'  => $conversation->id,
        'category'         => 'scam',
        'reason'           => 'Fake job offer asking for upfront payment.',
        'status'           => 'pending',
    ]);

    $this->actingAs($admin)
        ->withoutVite()
        ->get(route('admin.chat-reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/chat-reports/index')
            ->has('reports')
            ->has('stats'));

    $this->actingAs($admin)
        ->withoutVite()
        ->get(route('admin.chat-reports.show', $report))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/chat-reports/show')
            ->where('report.id', $report->id)
            ->has('recent_messages'));

    $this->actingAs($admin)
        ->patch(route('admin.chat-reports.update', $report), [
            'status' => 'reviewed',
            'admin_notes' => 'Confirmed scam pattern.',
            'reported_user_status' => 'suspended',
        ])
        ->assertRedirect();

    $report->refresh();
    $employer->refresh();

    expect($report->status)->toBe('reviewed');
    expect($report->admin_notes)->toBe('Confirmed scam pattern.');
    expect($report->reviewed_by)->toBe($admin->id);
    expect($employer->account_status)->toBe('suspended');
});

test('non-admin cannot access chat report admin pages', function () {
    ['employer' => $employer, 'conversation' => $conversation] = createChatConversation();

    $report = ChatReport::create([
        'reporter_id'      => $employer->id,
        'reported_user_id' => $conversation->job_seeker_id,
        'conversation_id'  => $conversation->id,
        'category'         => 'other',
        'reason'           => 'Some issue in chat.',
        'status'           => 'pending',
    ]);

    $this->actingAs($employer)
        ->get(route('admin.chat-reports.index'))
        ->assertForbidden();

    $this->actingAs($employer)
        ->get(route('admin.chat-reports.show', $report))
        ->assertForbidden();
});
