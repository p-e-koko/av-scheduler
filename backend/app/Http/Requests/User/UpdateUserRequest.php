<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization will be handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'student_id' => 'nullable|string|unique:users,student_id,' . $userId,
            'username' => 'nullable|string|unique:users,username,' . $userId,
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $userId,
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|required|in:admin,supervisor,coordinator,student',
            'promised_hours_per_week' => 'nullable|numeric|min:0|max:168',
            'remaining_hours_this_week' => 'nullable|numeric|min:0|max:168',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Remove password if it's empty
        if ($this->password === '') {
            $this->request->remove('password');
        }
    }
}
