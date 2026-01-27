<?php

namespace App\Http\Requests\Availability;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAvailabilityRequest extends FormRequest
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
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i:s',
            'end_time' => 'required|date_format:H:i:s|after:start_time',
            'status' => 'required|in:available,unavailable,class',
            'title' => 'required|string|max:255',
            'recurrence_id' => 'nullable|uuid',
        ];

        // Only coordinators can set student_id for other users
        $user = $this->user();
        if ($user && $user->role === 'coordinator') {
            $rules['student_id'] = 'nullable|string|exists:users,id';
        }

        return $rules;
    }

    /**
     * Get custom validation rules that check for overlapping availability.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $studentId = $this->input('student_id') ?? $user->id;
            $date = $this->input('date');
            $startTime = $this->input('start_time');
            $endTime = $this->input('end_time');

            // Ensure students can only create availability for themselves
            if ($user->role === 'student' && $this->has('student_id') && $this->input('student_id') !== $user->id) {
                $validator->errors()->add('student_id', 'Students can only create availability for themselves.');
                return;
            }

            if ($studentId && $date && $startTime && $endTime) {
                // Check for overlapping availability
                $overlapping = \App\Models\Availability::where('student_id', $studentId)
                    ->where('date', $date)
                    ->where(function ($query) use ($startTime, $endTime) {
                        $query->where(function ($q) use ($startTime, $endTime) {
                            // New slot starts during existing slot
                            $q->where('start_time', '<=', $startTime)
                              ->where('end_time', '>', $startTime);
                        })->orWhere(function ($q) use ($startTime, $endTime) {
                            // New slot ends during existing slot
                            $q->where('start_time', '<', $endTime)
                              ->where('end_time', '>=', $endTime);
                        })->orWhere(function ($q) use ($startTime, $endTime) {
                            // New slot completely encompasses existing slot
                            $q->where('start_time', '>=', $startTime)
                              ->where('end_time', '<=', $endTime);
                        });
                    })
                    ->exists();

                if ($overlapping) {
                    $validator->errors()->add('time_overlap', 'This time slot overlaps with an existing availability entry.');
                }
            }

            // Validate time is within allowed range (8 AM to 10 PM)
            if ($startTime && $endTime) {
                $startHour = (int) substr($startTime, 0, 2);
                $endHour = (int) substr($endTime, 0, 2);
                $endMinute = (int) substr($endTime, 3, 2);

                if ($startHour < 8) {
                    $validator->errors()->add('start_time', 'Start time cannot be before 8:00 AM.');
                }

                if ($endHour > 22 || ($endHour === 22 && $endMinute > 0)) {
                    $validator->errors()->add('end_time', 'End time cannot be after 10:00 PM.');
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'date.required' => 'The date field is required.',
            'date.date' => 'The date must be a valid date.',
            'start_time.required' => 'The start time field is required.',
            'start_time.date_format' => 'The start time must be in H:i:s format (e.g., 14:30:00).',
            'end_time.required' => 'The end time field is required.',
            'end_time.date_format' => 'The end time must be in H:i:s format (e.g., 16:30:00).',
            'end_time.after' => 'The end time must be after the start time.',
            'status.required' => 'The status field is required.',
            'status.in' => 'The status must be one of: available, unavailable, class.',
            'student_id.exists' => 'The selected student does not exist.',
        ];
    }
}
