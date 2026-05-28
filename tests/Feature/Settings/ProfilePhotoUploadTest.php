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
