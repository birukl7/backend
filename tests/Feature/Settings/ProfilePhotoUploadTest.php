<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('profile photo can be uploaded', function () {
    Storage::fake('public');

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->post(route('profile.photo'), [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->profile_photo)->not->toBeNull();
    Storage::disk('public')->assertExists($user->profile_photo);
});

test('local public uploads can be served without storage symlink', function () {
    Storage::fake('public');
    Storage::disk('public')->put('profile-photos/test.png', 'fake-image');

    $response = $this->get('/storage/profile-photos/test.png');

    $response->assertOk();
});
