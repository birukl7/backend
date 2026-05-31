<?php

use App\Models\User;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Spatie\Permission\Models\Role;

function mockGoogleSocialiteUser(
    string $id = 'google-123',
    string $email = 'google@example.com',
    ?string $name = 'Google User',
): SocialiteUser {
    $user = Mockery::mock(SocialiteUser::class);
    $user->shouldReceive('getId')->andReturn($id);
    $user->shouldReceive('getEmail')->andReturn($email);
    $user->shouldReceive('getName')->andReturn($name);
    $user->shouldReceive('getAvatar')->andReturn(null);

    return $user;
}

function mockGoogleSocialiteProvider(SocialiteUser $googleUser): void
{
    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->andReturn($googleUser);

    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
}

test('new google users have email verified automatically', function () {
    Role::firstOrCreate(['name' => 'job_seeker', 'guard_name' => 'web']);

    mockGoogleSocialiteProvider(mockGoogleSocialiteUser());

    $response = $this->get(route('auth.google.callback'));

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticated();

    $user = User::query()->where('email', 'google@example.com')->first();

    expect($user)->not->toBeNull();
    expect($user->hasVerifiedEmail())->toBeTrue();
    expect($user->google_id)->toBe('google-123');
});

test('existing unverified users are verified on google login', function () {
    $user = User::factory()->unverified()->create([
        'email' => 'google@example.com',
    ]);

    mockGoogleSocialiteProvider(mockGoogleSocialiteUser());

    $this->get(route('auth.google.callback'));

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});
