<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
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
        $rules = [
            'student_id' => 'nullable|string|unique:users,student_id',
            'username' => 'nullable|string|unique:users,username',
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,supervisor,coordinator,student',
            'profile_picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:512000', // 500MB = 512000KB
            'promised_hours_per_week' => 'nullable|numeric|min:0|max:20',
            'remaining_hours_this_week' => [
                'nullable',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) {
                    $promisedHours = $this->input('promised_hours_per_week');
                    if ($promisedHours !== null && $value > $promisedHours) {
                        $fail('The remaining hours this week cannot exceed the promised hours per week.');
                    }
                }
            ],
        ];

        // Make promised_hours_per_week required for students
        if ($this->input('role') === 'student') {
            $rules['promised_hours_per_week'] = 'required|numeric|min:1|max:20';
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'profile_picture.image' => 'The profile picture must be an image.',
            'profile_picture.mimes' => 'The profile picture must be a file of type: jpeg, png, jpg, gif.',
            'profile_picture.max' => 'The profile picture may not be greater than 500MB.',
            'promised_hours_per_week.required' => 'The promised hours per week field is required for students.',
            'promised_hours_per_week.min' => 'Students must promise at least 1 hour per week.',
            'promised_hours_per_week.max' => 'The promised hours per week cannot exceed 20 hours.',
            'remaining_hours_this_week.max' => 'The remaining hours this week cannot exceed 20 hours.',
        ];
    }
}
