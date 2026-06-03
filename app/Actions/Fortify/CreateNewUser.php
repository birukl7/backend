<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     */
    public function create(array $input): User
    {
        $rules = [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'role' => ['required', 'string', Rule::in(['admin', 'employer', 'job_seeker'])],
            'headline' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'experience_years' => ['nullable', 'integer', 'min:0', 'max:20'],
            'location' => ['nullable', 'string'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'company_description' => ['nullable', 'string'],
            'company_website' => ['nullable', 'url'],
        ];

        if (($input['role'] ?? null) === 'employer') {
            $isCompanyEmployer = ($input['employer_type'] ?? '') === 'company';

            $rules['employer_type'] = ['required', 'string', Rule::in(['basic', 'company'])];
            $rules['national_id'] = ['required', 'string', 'regex:/^\d{16}$/'];
            $rules['company_tin_number'] = [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
                'max:255',
            ];
            $rules['company_name'] = [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
                'max:255',
            ];
            $rules['company_website'] = [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'url',
            ];
            $rules['company_description'] = [
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
            ];
        }

        $validator = Validator::make($input, $rules);

        $validator->setAttributeNames([
            'national_id' => 'National ID (FAN)',
            'company_tin_number' => 'TIN number',
        ]);

        $validator->validate();

        $attributes = [
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => bcrypt($input['password']),
            'headline' => $input['headline'] ?? null,
            'bio' => $input['bio'] ?? null,
            'experience_years' => $input['experience_years'] ?? null,
            'location' => $input['location'] ?? null,
            'company_name' => $input['company_name'] ?? null,
            'company_description' => $input['company_description'] ?? null,
            'company_website' => $input['company_website'] ?? null,
        ];

        if (($input['role'] ?? null) === 'employer') {
            $attributes['employer_type'] = $input['employer_type'];
            $attributes['national_id'] = $input['national_id'];
            $attributes['company_tin_number'] = $input['company_tin_number'] ?? null;
            $attributes['employer_verification_status'] = 'pending';
            $attributes['employer_submitted_at'] = now();
            $attributes['company_verification_status'] = 'pending';
            $attributes['company_submitted_at'] = now();
        }

        $user = User::create($attributes);

        $role = Role::firstOrCreate(
            ['name' => $input['role'], 'guard_name' => 'web'],
        );

        $user->assignRole($role);

        return $user;
    }
}
