<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'employer', 'guard_name' => 'web']);
});

test('employer verification page is displayed for employers', function () {
    $user = User::factory()->create();
    $user->assignRole('employer');

    $response = $this
        ->withoutVite()
        ->actingAs($user)
        ->get(route('employer-verification.edit'));

    $response->assertOk();
});

test('job seekers cannot access employer verification page', function () {
    Role::firstOrCreate(['name' => 'job_seeker', 'guard_name' => 'web']);

    $user = User::factory()->create();
    $user->assignRole('job_seeker');

    $this
        ->actingAs($user)
        ->get(route('employer-verification.edit'))
        ->assertForbidden();
});

test('basic employer can submit verification details', function () {
    $user = User::factory()->create();
    $user->assignRole('employer');

    $response = $this
        ->actingAs($user)
        ->patch(route('employer-verification.update'), [
            'employer_type' => 'basic',
            'national_id' => '1234567890123456',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('employer-verification.edit'));

    $user->refresh();

    expect($user->employer_type)->toBe('basic');
    expect($user->national_id)->toBe('1234567890123456');
    expect($user->employer_verification_status)->toBe('pending');
    expect($user->employer_submitted_at)->not->toBeNull();
    expect($user->company_name)->toBeNull();
});

test('company employer can submit verification details', function () {
    $user = User::factory()->create();
    $user->assignRole('employer');

    $response = $this
        ->actingAs($user)
        ->patch(route('employer-verification.update'), [
            'employer_type' => 'company',
            'national_id' => '1234567890123456',
            'company_tin_number' => 'TIN-123456789',
            'company_name' => 'Acme Corp',
            'company_website' => 'https://acme.example.com',
            'company_description' => 'We build things.',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('employer-verification.edit'));

    $user->refresh();

    expect($user->employer_type)->toBe('company');
    expect($user->company_name)->toBe('Acme Corp');
    expect($user->company_verification_status)->toBe('pending');
    expect($user->company_submitted_at)->not->toBeNull();
});

test('company employer must provide company fields', function () {
    $user = User::factory()->create();
    $user->assignRole('employer');

    $response = $this
        ->actingAs($user)
        ->from(route('employer-verification.edit'))
        ->patch(route('employer-verification.update'), [
            'employer_type' => 'company',
            'national_id' => '1234567890123456',
        ]);

    $response->assertSessionHasErrors(['company_name', 'company_website', 'company_tin_number']);
});
