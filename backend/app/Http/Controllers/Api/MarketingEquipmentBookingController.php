<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketingEquipment;
use App\Models\MarketingEquipmentBooking;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MarketingEquipmentBookingController extends Controller
{
    /**
     * Store a newly created pre-booking in storage.
     */
    public function store(Request $request, MarketingEquipment $equipment): JsonResponse
    {
        if ($equipment->status === 'maintenance') {
            return response()->json(['message' => 'Equipment is under maintenance and cannot be booked.'], 422);
        }

        $startTime = $request->start_time;
        $endTime = $request->end_time;

        $hasBookingConflict = $equipment->bookings()
            ->where('status', 'scheduled')
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                  ->where('end_time', '>', $startTime);
            })->exists();

        if ($hasBookingConflict) {
            return response()->json(['message' => 'Equipment is booked by someone else for the selected time window.'], 422);
        }

        $hasAssignmentConflict = $equipment->assignments()
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('event_start_datetime', '<', $endTime)
                  ->where('event_end_datetime', '>', $startTime);
            })->exists();

        if ($hasAssignmentConflict) {
            return response()->json(['message' => 'Equipment is assigned to another event during the selected time window.'], 422);
        }

        $booking = MarketingEquipmentBooking::create([
            'user_id' => $request->user()->id,
            'marketing_equipment_id' => $equipment->id,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'scheduled',
        ]);

        // Refresh equipment dynamic usage status
        $equipment->refreshStatus();

        $booking->load(['equipment', 'user']);

        // Notify marketing supervisors and coordinators
        try {
            $recipients = \App\Models\User::whereHas('roles', function ($q) {
                $q->whereIn('name', ['marketing_supervisor', 'marketing_coordinator', 'admin']);
            })->orWhereIn('role', ['marketing_supervisor', 'marketing_coordinator', 'admin'])->get();

            foreach ($recipients as $recipient) {
                if ($recipient->id !== $request->user()->id) {
                    $recipient->notify(new \App\Notifications\MarketingEquipmentBookedNotification($booking));
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send equipment booking notification: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Equipment pre-booked successfully.',
            'booking' => $booking
        ], 201);
    }

    /**
     * Cancel the specified pre-booking.
     */
    public function destroy(MarketingEquipmentBooking $booking, Request $request): JsonResponse
    {
        // Only allow supervisor/admin or the original booker to cancel
        if (!$request->user()->hasAnyRole(['admin', 'marketing_supervisor']) && 
            $request->user()->id !== $booking->user_id) {
            return response()->json(['message' => 'Unauthorized to cancel this booking'], 403);
        }

        $booking->status = 'cancelled';
        $booking->save();
        $booking->delete(); // Optionally soft delete or just delete. Migration has no soft delete, so we delete it.

        $equipment = $booking->equipment;
        if ($equipment) {
            $equipment->refreshStatus();
        }

        return response()->json([
            'message' => 'Booking cancelled successfully.'
        ]);
    }
}
