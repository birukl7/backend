<?php

use App\Models\User;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

test('blocked users are redirected to the restricted page on login', function () {
    $user = User::factory()->create([
        'account_status' => 'blocked',
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('account.restricted'));
    $this->assertGuest();
});

test('suspended users are redirected to the restricted page on login', function () {
    $user = User::factory()->create([
        'account_status' => 'suspended',
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('account.restricted'));
    $this->assertGuest();
});

test('restricted page shows blocked status for guests after login attempt', function () {
    $user = User::factory()->create([
        'account_status' => 'blocked',
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->get(route('account.restricted'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/account-restricted')
            ->where('account_status', 'blocked')
            ->where('can_logout', false));
});

test('authenticated blocked users are redirected from protected routes', function () {
    $user = User::factory()->create([
        'account_status' => 'blocked',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('account.restricted'));
});

test('authenticated blocked users can view the restricted page and log out', function () {
    $user = User::factory()->create([
        'account_status' => 'blocked',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('account.restricted'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/account-restricted')
            ->where('account_status', 'blocked')
            ->where('can_logout', true));

    $this->actingAs($user)
        ->post(route('logout'))
        ->assertRedirect(route('home'));

    $this->assertGuest();
});

test('active users can log in and access the dashboard', function () {
    $user = User::factory()->create([
        'account_status' => 'active',
        'email_verified_at' => now(),
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticated();
});

test('blocked google users are not logged in', function () {
    $user = User::factory()->create([
        'email' => 'google@example.com',
        'account_status' => 'blocked',
    ]);

    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-123');
    $googleUser->shouldReceive('getEmail')->andReturn('google@example.com');
    $googleUser->shouldReceive('getName')->andReturn('Google User');
    $googleUser->shouldReceive('getAvatar')->andReturn(null);

    $provider = Mockery::mock(Provider::class);
    $provider->shouldReceive('user')->andReturn($googleUser);
    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $this->get(route('auth.google.callback'))
        ->assertRedirect(route('account.restricted'));

    $this->assertGuest();
});
