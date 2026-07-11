<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MediaBooking\StoreMediaBookingRequest;
use App\Http\Requests\MediaBooking\UpdateMediaBookingRequest;
use App\Models\Assignment;
use App\Models\MediaBooking;
use App\Models\User;
use App\Notifications\BookingCreatedCustomerNotification;
use App\Notifications\BookingCreatedStaffNotification;
use App\Notifications\BookingUpdatedNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MediaBookingController extends Controller
{
    /**
     * List all bookings (for coordinator/supervisor view) or
     * just the authenticated customer's bookings.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->hasRole('customer')) {
            $query = MediaBooking::where('customer_id', $user->id)->with('customer', 'assignment');
        } else {
            // coordinators / supervisors / admin see all
            $query = MediaBooking::with('customer', 'assignment');
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by location (for showing existing bookings on calendar)
        if ($request->has('location')) {
            $query->where('location', $request->location);
        }

        // Filter by date range
        if ($request->has('date')) {
            $query->whereDate('start_datetime', $request->date);
        }

        $perPage = $request->get('per_page', 20);
        $bookings = $query->orderBy('start_datetime', 'asc')->paginate($perPage);

        return response()->json($bookings);
    }

    /**
     * Return all distinct booking locations (for the location picker).
     */
    public function locations(): JsonResponse
    {
        $locations = MediaBooking::whereNotIn('status', ['canceled'])
            ->distinct()
            ->pluck('location');

        // Predefined list of known locations:
        $predefinedLocations = [
            // General
            'Auditorium', 'Church', 'Fellowship Hall', 'Science Lobby', 'IT Lobby',
            // CH
            'CH113', 'CH114',
            // AD
            'AD103', 'AD104',
            'AD301', 'AD302', 'AD303', 'AD304', 'AD305', 'AD306', 'AD307', 'AD308',
            // IT
            'IT110', 'IT111', 'IT128', 'IT122',
            'IT210', 'IT211', 'IT222', 'IT223', 'IT224',
            'IT302', 'IT306', 'IT307',
        ];

        $allLocations = $locations->merge($predefinedLocations)->unique()->values();

        return response()->json(['locations' => $allLocations]);
    }

    /**
     * Check availability for a location + time slot.
     * Returns existing bookings for the chosen location on a given date.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'location' => 'required|string',
            'date'     => 'required|date',
        ]);

        $bookings = MediaBooking::where('location', $request->location)
            ->whereNotIn('status', ['canceled'])
            ->whereDate('start_datetime', $request->date)
            ->get(['id', 'event_name', 'start_datetime', 'end_datetime', 'status']);

        return response()->json(['bookings' => $bookings]);
    }

    /**
     * Store a new booking.
     */
    public function store(StoreMediaBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['customer_id'] = auth()->id();
        $data['status'] = 'to_assign';

        // Check for time conflict at the same location
        if (MediaBooking::hasConflict($data['location'], $data['start_datetime'], $data['end_datetime'])) {
            return response()->json([
                'message' => 'This location is already booked for the selected time. Please choose a different time or location.',
                'errors'  => ['start_datetime' => ['Time conflict detected for this location.']],
            ], 422);
        }

        DB::beginTransaction();
        try {
            $booking = MediaBooking::create($data);

            // Auto-create an Assignment with 'to_assign' status
            $assignment = Assignment::create([
                'assignment_name'      => 'Media Booking: ' . $booking->event_name,
                'event_name'           => $booking->event_name,
                'event_location'       => $booking->location,
                'event_start_datetime' => $booking->start_datetime,
                'event_end_datetime'   => $booking->end_datetime,
                'description'          => $this->buildDescription($booking),
                'status'               => 'to_assign',
                'created_by'           => auth()->id(),
            ]);

            // Link assignment to booking
            $booking->update(['assignment_id' => $assignment->id]);

            DB::commit();

            // Notification delivery should not fail the booking after the transaction has been committed.
            try {
                $customer = auth()->user();

                // 1. Notify the customer
                $customer->notify(new BookingCreatedCustomerNotification($booking));

                // 2. Notify all coordinators and supervisors
                $staff = User::role(['coordinator', 'supervisor'])->get();
                foreach ($staff as $staffMember) {
                    $staffMember->notify(new BookingCreatedStaffNotification($booking->fresh(['customer'])));
                }
            } catch (\Throwable $notificationError) {
                Log::warning('Media booking created but notification delivery failed.', [
                    'booking_id' => $booking->id,
                    'error' => $notificationError->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Booking submitted successfully. You will receive a confirmation email.',
                'booking' => $booking->load('customer', 'assignment'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create booking: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Show a single booking.
     */
    public function show(MediaBooking $mediaBooking): JsonResponse
    {
        $user = auth()->user();

        // Customers can only see their own bookings
        if ($user->hasRole('customer') && $mediaBooking->customer_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['booking' => $mediaBooking->load('customer', 'assignment')]);
    }

    /**
     * Update a booking (customer only, their own bookings).
     */
    public function update(UpdateMediaBookingRequest $request, MediaBooking $mediaBooking): JsonResponse
    {
        // Can only edit bookings that haven't been canceled or completed
        if (in_array($mediaBooking->status, ['canceled', 'complete'])) {
            return response()->json(['message' => 'This booking cannot be edited.'], 422);
        }

        $data = $request->validated();

        // If location or time changed, re-check conflict
        $newLocation = $data['location'] ?? $mediaBooking->location;
        $newStart    = $data['start_datetime'] ?? $mediaBooking->start_datetime;
        $newEnd      = $data['end_datetime'] ?? $mediaBooking->end_datetime;

        if (MediaBooking::hasConflict($newLocation, $newStart, $newEnd, $mediaBooking->id)) {
            return response()->json([
                'message' => 'This location is already booked for the selected time.',
                'errors'  => ['start_datetime' => ['Time conflict detected for this location.']],
            ], 422);
        }

        $mediaBooking->update($data);

        // Update the linked assignment too
        if ($mediaBooking->assignment) {
            $mediaBooking->assignment->update([
                'event_name'           => $data['event_name'] ?? $mediaBooking->event_name,
                'event_location'       => $newLocation,
                'event_start_datetime' => $newStart,
                'event_end_datetime'   => $newEnd,
                'description'          => $this->buildDescription($mediaBooking->fresh()),
            ]);
        }

        // Notify coordinators and supervisors
        $staff = User::role(['coordinator', 'supervisor'])->get();
        foreach ($staff as $staffMember) {
            $staffMember->notify(new BookingUpdatedNotification($mediaBooking->fresh(['customer']), 'edited', null, false));
        }

        return response()->json([
            'message' => 'Booking updated successfully.',
            'booking' => $mediaBooking->fresh(['customer', 'assignment']),
        ]);
    }

    /**
     * Cancel a booking (customer cancels their own; coordinator cancels any).
     */
    public function cancel(Request $request, MediaBooking $mediaBooking): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $user = auth()->user();

        // Customers can only cancel their own bookings
        if ($user->hasRole('customer') && $mediaBooking->customer_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Cannot cancel already canceled bookings
        if ($mediaBooking->status === 'canceled') {
            return response()->json(['message' => 'Booking is already canceled.'], 422);
        }

        $canceledBy = $user->hasRole('customer') ? 'customer' : 'coordinator';

        $mediaBooking->update([
            'status'        => 'canceled',
            'cancel_reason' => $request->reason,
            'canceled_by'   => $canceledBy,
        ]);

        // Also update the linked assignment to 'canceled' status
        if ($mediaBooking->assignment) {
            $mediaBooking->assignment->update(['status' => 'canceled']);
        }

        $bookingWithCustomer = $mediaBooking->fresh(['customer']);

        // Notify customer (if coordinator canceled) or all staff (if customer canceled)
        if ($canceledBy === 'coordinator') {
            $mediaBooking->customer->notify(
                new BookingUpdatedNotification($bookingWithCustomer, 'canceled', $request->reason, true)
            );
        }

        // Always notify all coordinators and supervisors
        $staff = User::role(['coordinator', 'supervisor'])->get();
        foreach ($staff as $staffMember) {
            $staffMember->notify(
                new BookingUpdatedNotification($bookingWithCustomer, 'canceled', $request->reason, false)
            );
        }

        return response()->json(['message' => 'Booking has been canceled.']);
    }

    /**
     * Get customer info for a booking (used by coordinator "contact customer" button).
     */
    public function customerInfo(MediaBooking $mediaBooking): JsonResponse
    {
        $user = auth()->user();
        if (!$user->hasAnyRole(['coordinator', 'supervisor', 'admin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $customer = $mediaBooking->customer;
        return response()->json([
            'customer' => [
                'id'    => $customer->id,
                'name'  => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone_number,
            ]
        ]);
    }

    /** Build a description string from booking details */
    private function buildDescription(MediaBooking $booking): string
    {
        $lines = ['[Media Service Booking]'];
        if ($booking->equipment_request) {
            $lines[] = 'Equipment: ' . $booking->equipment_request;
        }
        $extras = [];
        if ($booking->ac_required) $extras[] = 'AC';
        if ($booking->spotlight_required) $extras[] = 'Spotlight (Follow Light)';
        if ($booking->led_light_required) $extras[] = 'LED Light';
        if ($extras) {
            $lines[] = 'Additional: ' . implode(', ', $extras);
        }
        $lines[] = 'Note: Celine light will be turned on.';
        return implode("\n", $lines);
    }
}
