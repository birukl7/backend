<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployerVerificationUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('employer') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $input = $this->all();
        $isCompanyEmployer = ($input['employer_type'] ?? '') === 'company';

        return [
            'employer_type' => ['required', 'string', Rule::in(['basic', 'company'])],
            'national_id' => ['required', 'string', 'regex:/^\d{16}$/'],
            'company_tin_number' => [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
                'max:255',
            ],
            'company_name' => [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
                'max:255',
            ],
            'company_website' => [
                Rule::requiredIf(fn () => $isCompanyEmployer),
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'url',
            ],
            'company_description' => [
                Rule::prohibitedIf(fn () => ! $isCompanyEmployer),
                'nullable',
                'string',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'national_id' => 'National ID (FAN)',
            'company_tin_number' => 'TIN number',
        ];
    }
}
