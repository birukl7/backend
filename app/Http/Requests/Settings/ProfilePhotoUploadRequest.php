<?php

namespace App\Http\Requests\Settings;

use App\Support\PhpIniSize;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class ProfilePhotoUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'file', 'image', 'max:'.PhpIniSize::uploadMaxKilobytes()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $limit = PhpIniSize::uploadMaxLabel();

        return [
            'photo.required' => 'Please choose an image to upload.',
            'photo.file' => 'Please choose a valid image file.',
            'photo.image' => 'The file must be an image (JPG, PNG, GIF, or WebP).',
            'photo.max' => "The image must not be larger than {$limit}.",
            'photo.uploaded' => "The image is too large for the server to accept (limit: {$limit}). Try a smaller file or restart the server with a higher PHP upload_max_filesize.",
        ];
    }

    /**
     * Explain PHP-level upload failures before standard validation runs.
     */
    protected function prepareForValidation(): void
    {
        if ($this->hasFile('photo')) {
            return;
        }

        $error = (int) ($_FILES['photo']['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            throw ValidationException::withMessages([
                'photo' => 'The image is too large (server limit: '.PhpIniSize::uploadMaxLabel().'). Please choose a smaller file.',
            ]);
        }
    }

}
