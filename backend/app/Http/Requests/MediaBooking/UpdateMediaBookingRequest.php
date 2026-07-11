<?php

namespace App\Http\Requests\MediaBooking;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMediaBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        $booking = $this->route('mediaBooking');
        // Only the customer who made the booking can edit it
        return auth()->check() &&
               auth()->user()->hasRole('customer') &&
               $booking->customer_id === auth()->id();
    }

    public function rules(): array
    {
        return [
            'event_name'         => 'sometimes|required|string|max:255',
            'location'           => 'sometimes|required|string|max:255',
            'start_datetime'     => 'sometimes|required|date|after:tomorrow',
            'end_datetime'       => 'sometimes|required|date|after:start_datetime',
            'equipment_request'  => 'nullable|string|max:1000',
            'ac_required'        => 'boolean',
            'spotlight_required' => 'boolean',
            'led_light_required' => 'boolean',
        ];
    }
}
