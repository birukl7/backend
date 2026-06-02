<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfilePhotoUploadRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Support\PhpIniSize;
use App\Support\PublicUploads;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'usesPassword' => $request->user()->hasPassword(),
            'status' => $request->session()->get('status'),
            'maxProfilePhotoBytes' => PhpIniSize::uploadMaxKilobytes() * 1024,
            'maxProfilePhotoLabel' => PhpIniSize::uploadMaxLabel(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Upload or replace the user's profile photo.
     */
    public function uploadPhoto(ProfilePhotoUploadRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->profile_photo && ! str_starts_with($user->profile_photo, 'http')) {
            PublicUploads::delete($user->profile_photo);
        }

        $path = PublicUploads::store($request->file('photo'), 'profile-photos');
        $user->update(['profile_photo' => $path]);

        return to_route('profile.edit');
    }

    /**
     * Remove the user's profile photo.
     */
    public function destroyPhoto(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->profile_photo && ! str_starts_with($user->profile_photo, 'http')) {
            PublicUploads::delete($user->profile_photo);
        }

        $user->update(['profile_photo' => null]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->profile_photo && ! str_starts_with($user->profile_photo, 'http')) {
            PublicUploads::delete($user->profile_photo);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
