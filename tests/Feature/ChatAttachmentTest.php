<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Support\PublicUploads;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Storage::fake('public');
    Role::firstOrCreate(['name' => 'employer', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'job_seeker', 'guard_name' => 'web']);
});

test('user can send a chat message with a pdf attachment', function () {
    $employer = User::factory()->create();
    $employer->assignRole('employer');
    $jobSeeker = User::factory()->create();
    $jobSeeker->assignRole('job_seeker');

    $conversation = Conversation::create([
        'employer_id'   => $employer->id,
        'job_seeker_id' => $jobSeeker->id,
        'status'        => 'active',
    ]);

    $file = UploadedFile::fake()->create('resume.pdf', 120, 'application/pdf');

    $response = $this->actingAs($employer)
        ->postJson(route('chat.send', $conversation), [
            'body'       => 'Here is my document',
            'attachment' => $file,
        ]);

    $response->assertOk()
        ->assertJsonPath('body', 'Here is my document')
        ->assertJsonPath('attachment.type', 'pdf')
        ->assertJsonPath('attachment.name', 'resume.pdf');

    $message = Message::first();
    expect($message->attachment_type)->toBe('pdf');
    expect($message->attachment_path)->not->toBeEmpty();
    Storage::disk('public')->assertExists($message->attachment_path);
    expect(PublicUploads::url($message->attachment_path))->not->toBeNull();
});

test('user can send an image-only chat message', function () {
    $employer = User::factory()->create();
    $employer->assignRole('employer');
    $jobSeeker = User::factory()->create();
    $jobSeeker->assignRole('job_seeker');

    $conversation = Conversation::create([
        'employer_id'   => $employer->id,
        'job_seeker_id' => $jobSeeker->id,
        'status'        => 'active',
    ]);

    $file = UploadedFile::fake()->image('photo.png');

    $response = $this->actingAs($jobSeeker)
        ->postJson(route('chat.send', $conversation), [
            'attachment' => $file,
        ]);

    $response->assertOk()
        ->assertJsonPath('body', '')
        ->assertJsonPath('attachment.type', 'image')
        ->assertJsonPath('attachment.name', 'photo.png');

    expect(Message::first()->previewText())->toBe('📷 Photo');
});

test('chat message requires body or attachment', function () {
    $employer = User::factory()->create();
    $employer->assignRole('employer');
    $jobSeeker = User::factory()->create();
    $jobSeeker->assignRole('job_seeker');

    $conversation = Conversation::create([
        'employer_id'   => $employer->id,
        'job_seeker_id' => $jobSeeker->id,
        'status'        => 'active',
    ]);

    $this->actingAs($employer)
        ->postJson(route('chat.send', $conversation), [])
        ->assertUnprocessable();
});
