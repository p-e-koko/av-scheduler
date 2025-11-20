<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
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
        return [
            'assignment_name' => 'required|string|max:255',
            'event_name' => 'required|string|max:255',
            'event_location' => 'required|string|max:255',
            'event_start_datetime' => [
                'required',
                'date',
                'after_or_equal:now',
                function ($attribute, $value, $fail) {
                    $endDateTime = $this->input('event_end_datetime');
                    if ($endDateTime && strtotime($value) >= strtotime($endDateTime)) {
                        $fail('The event start date must be before the event end date.');
                    }
                }
            ],
            'event_end_datetime' => [
                'required',
                'date',
                'after:event_start_datetime',
                function ($attribute, $value, $fail) {
                    $startDateTime = $this->input('event_start_datetime');
                    if ($startDateTime) {
                        $startTime = strtotime($startDateTime);
                        $endTime = strtotime($value);
                        $diffInHours = ($endTime - $startTime) / 3600;

                        // Maximum event duration of 24 hours
                        if ($diffInHours > 24) {
                            $fail('The event duration cannot exceed 24 hours.');
                        }

                        // Minimum event duration of 30 minutes
                        if ($diffInHours < 0.5) {
                            $fail('The event duration must be at least 30 minutes.');
                        }
                    }
                }
            ],
            'description' => 'nullable|string|max:1000',
            'status' => 'required|in:pending,confirmed,complete',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default status to pending if not provided
        if (!$this->has('status') || empty($this->status)) {
            $this->merge(['status' => 'pending']);
        }

        // Ensure datetime fields are properly formatted
        if ($this->has('event_start_datetime')) {
            $this->merge([
                'event_start_datetime' => date('Y-m-d H:i:s', strtotime($this->event_start_datetime))
            ]);
        }

        if ($this->has('event_end_datetime')) {
            $this->merge([
                'event_end_datetime' => date('Y-m-d H:i:s', strtotime($this->event_end_datetime))
            ]);
        }
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'assignment_name.required' => 'The assignment name field is required.',
            'assignment_name.string' => 'The assignment name must be a string.',
            'assignment_name.max' => 'The assignment name may not be greater than 255 characters.',

            'event_name.required' => 'The event name field is required.',
            'event_name.string' => 'The event name must be a string.',
            'event_name.max' => 'The event name may not be greater than 255 characters.',

            'event_location.required' => 'The event location field is required.',
            'event_location.string' => 'The event location must be a string.',
            'event_location.max' => 'The event location may not be greater than 255 characters.',

            'event_start_datetime.required' => 'The event start date and time field is required.',
            'event_start_datetime.date' => 'The event start date and time must be a valid date.',
            'event_start_datetime.after_or_equal' => 'The event start date and time must be in the future.',

            'event_end_datetime.required' => 'The event end date and time field is required.',
            'event_end_datetime.date' => 'The event end date and time must be a valid date.',
            'event_end_datetime.after' => 'The event end date and time must be after the start date and time.',

            'description.string' => 'The description must be a string.',
            'description.max' => 'The description may not be greater than 1000 characters.',

            'status.required' => 'The status field is required.',
            'status.in' => 'The selected status is invalid. Must be one of: pending, confirmed, complete.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'assignment_name' => 'assignment name',
            'event_name' => 'event name',
            'event_location' => 'event location',
            'event_start_datetime' => 'event start date and time',
            'event_end_datetime' => 'event end date and time',
            'description' => 'description',
            'status' => 'status',
        ];
    }
}
