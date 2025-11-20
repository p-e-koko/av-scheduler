<?php

namespace App\Http\Requests\Assignment;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssignmentRequest extends FormRequest
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
            'assignment_name' => 'sometimes|required|string|max:255',
            'event_name' => 'sometimes|required|string|max:255',
            'event_location' => 'sometimes|required|string|max:255',
            'event_start_datetime' => [
                'sometimes',
                'required',
                'date',
                function ($attribute, $value, $fail) {
                    $assignment = $this->route('assignment');
                    $endDateTime = $this->input('event_end_datetime') ?? $assignment->event_end_datetime;

                    // Only validate future date for assignments that haven't started yet
                    if ($assignment && $assignment->event_start_datetime > now() && strtotime($value) < time()) {
                        $fail('The event start date and time must be in the future for upcoming assignments.');
                    }

                    if ($endDateTime && strtotime($value) >= strtotime($endDateTime)) {
                        $fail('The event start date must be before the event end date.');
                    }
                }
            ],
            'event_end_datetime' => [
                'sometimes',
                'required',
                'date',
                'after:event_start_datetime',
                function ($attribute, $value, $fail) {
                    $assignment = $this->route('assignment');
                    $startDateTime = $this->input('event_start_datetime') ?? $assignment->event_start_datetime;

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

                    // Don't allow changing end date to past for ongoing assignments
                    if ($assignment && $assignment->isOngoing() && strtotime($value) < time()) {
                        $fail('Cannot set end date to the past for ongoing assignments.');
                    }
                }
            ],
            'description' => 'nullable|string|max:1000',
            'status' => [
                'sometimes',
                'required',
                'in:pending,confirmed,complete',
                function ($attribute, $value, $fail) {
                    $assignment = $this->route('assignment');

                    // Prevent status regression (complete -> confirmed/pending)
                    if ($assignment && $assignment->status === 'complete' && $value !== 'complete') {
                        $fail('Cannot change status from complete to a previous status.');
                    }

                    // Only allow complete status for past assignments
                    if ($value === 'complete' && $assignment && $assignment->isUpcoming()) {
                        $fail('Cannot mark upcoming assignments as complete.');
                    }
                }
            ],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Ensure datetime fields are properly formatted if provided
        if ($this->has('event_start_datetime') && !empty($this->event_start_datetime)) {
            $this->merge([
                'event_start_datetime' => date('Y-m-d H:i:s', strtotime($this->event_start_datetime))
            ]);
        }

        if ($this->has('event_end_datetime') && !empty($this->event_end_datetime)) {
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
