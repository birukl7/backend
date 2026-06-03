<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\EmployerVerificationUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployerVerificationController extends Controller
{
    public function edit(Request $request): Response
    {
        abort_unless($request->user()?->hasRole('employer'), 403);

        $user = $request->user();

        return Inertia::render('settings/employer-verification', [
            'employer' => [
                'employer_type' => $user->employer_type,
                'national_id' => $user->national_id,
                'company_tin_number' => $user->company_tin_number,
                'company_name' => $user->company_name,
                'company_website' => $user->company_website,
                'company_description' => $user->company_description,
                'employer_verification_status' => $user->employer_verification_status,
                'company_verification_status' => $user->company_verification_status,
                'needs_completion' => $user->needs_employer_profile_completion,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(EmployerVerificationUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $isCompany = $validated['employer_type'] === 'company';

        $attributes = [
            'employer_type' => $validated['employer_type'],
            'national_id' => $validated['national_id'],
            'employer_verification_status' => 'pending',
            'employer_verified_at' => null,
            'employer_verified_by' => null,
            'employer_verification_notes' => null,
            'employer_submitted_at' => now(),
        ];

        if ($isCompany) {
            $attributes['company_tin_number'] = $validated['company_tin_number'];
            $attributes['company_name'] = $validated['company_name'];
            $attributes['company_website'] = $validated['company_website'];
            $attributes['company_description'] = $validated['company_description'] ?? null;
            $attributes['company_verification_status'] = 'pending';
            $attributes['company_verified_at'] = null;
            $attributes['company_verified_by'] = null;
            $attributes['company_verification_notes'] = null;
            $attributes['company_submitted_at'] = now();
        } else {
            $attributes['company_tin_number'] = null;
            $attributes['company_name'] = null;
            $attributes['company_website'] = null;
            $attributes['company_description'] = null;
            $attributes['company_verification_status'] = 'pending';
            $attributes['company_submitted_at'] = null;
        }

        $user->forceFill($attributes)->save();

        return to_route('employer-verification.edit')
            ->with('status', 'verification-submitted');
    }
}
