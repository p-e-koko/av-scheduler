<?php

namespace App\Http\Requests\MediaBooking;

use Illuminate\Foundation\Http\FormRequest;

class StoreMediaBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->hasRole('customer');
    }

    public function rules(): array
    {
        return [
            'event_name'         => 'required|string|max:255',
            'location'           => 'required|string|max:255',
            'start_datetime'     => 'required|date|after:tomorrow',
            // "booking must be made one day before" → start must be after tomorrow (i.e. ≥ day after today)
            'end_datetime'       => 'required|date|after:start_datetime',
            'equipment_request'  => 'nullable|string|max:1000',
            'ac_required'        => 'boolean',
            'spotlight_required' => 'boolean',
            'led_light_required' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'start_datetime.after' => 'Booking must be made at least one day in advance.',
        ];
    }
}
