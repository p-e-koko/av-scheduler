<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Availability;
use App\Models\ITOfficeSchedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ITOfficeScheduleController extends Controller
{
    /**
     * Get IT Office Schedules.
     * Supervisor gets all; IT assistant gets only their own.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('supervisor') || $user->hasRole('admin') || $user->hasRole('coordinator')) {
            $schedules = ITOfficeSchedule::with('student', 'creator')->get();
        } else {
            // IT Assistant — only own schedules
            $schedules = ITOfficeSchedule::with('student', 'creator')
                ->where('student_id', $user->id)
                ->get();
        }

        return response()->json(['data' => $schedules]);
    }

    /**
     * Create a new IT Office Schedule slot.
     * Supervisor only.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasRole('supervisor') && !$user->hasRole('admin') && !$user->hasRole('coordinator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'student_id'  => 'required|uuid|exists:users,id',
            'day_of_week' => 'required|integer|min:0|max:5',
            'start_time'  => 'required|date_format:H:i',
            'end_time'    => 'required|date_format:H:i|after:start_time',
        ]);

        $schedule = ITOfficeSchedule::create([
            'student_id'  => $validated['student_id'],
            'created_by'  => $user->id,
            'day_of_week' => $validated['day_of_week'],
            'start_time'  => $validated['start_time'],
            'end_time'    => $validated['end_time'],
        ]);

        $schedule->load('student', 'creator');

        return response()->json(['data' => $schedule], 201);
    }

    /**
     * Update an existing IT Office Schedule slot.
     * Supervisor only.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasRole('supervisor') && !$user->hasRole('admin') && !$user->hasRole('coordinator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = ITOfficeSchedule::findOrFail($id);

        $validated = $request->validate([
            'student_id'  => 'sometimes|uuid|exists:users,id',
            'day_of_week' => 'sometimes|integer|min:0|max:5',
            'start_time'  => 'sometimes|date_format:H:i',
            'end_time'    => 'sometimes|date_format:H:i',
        ]);

        $schedule->update($validated);
        $schedule->load('student', 'creator');

        return response()->json(['data' => $schedule]);
    }

    /**
     * Delete an IT Office Schedule slot (soft delete).
     * Supervisor only.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasRole('supervisor') && !$user->hasRole('admin') && !$user->hasRole('coordinator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedule = ITOfficeSchedule::findOrFail($id);
        $schedule->delete();

        return response()->json(['message' => 'Schedule slot deleted successfully']);
    }

    /**
     * Get IT Assistants who are available at a given day and hour.
     * Supervisor only.
     */
    public function availableAssistants(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->hasRole('supervisor') && !$user->hasRole('admin') && !$user->hasRole('coordinator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'day'  => 'required|integer|min:0|max:5',
            'hour' => 'required|integer|min:8|max:18',
        ]);

        $day  = (int) $request->input('day');
        $hour = (int) $request->input('hour');

        // Get all IT assistants
        $itAssistants = User::where('is_IT', true)->orderBy('created_at')->get();

        // Build a padded start/end for the requested 1-hour slot
        // e.g. hour=9 → we check if any availability overlaps 09:00–10:00
        $slotStart = sprintf('%02d:00:00', $hour);
        $slotEnd   = sprintf('%02d:00:00', $hour + 1);

        $available = $itAssistants->filter(function ($assistant) use ($day, $slotStart, $slotEnd) {
            // Check if there is ANY blocking availability (class or unavailable) that overlaps this slot
            $hasBlocker = Availability::where('student_id', $assistant->id)
                ->whereRaw("DAYOFWEEK(date) - 1 = ?", [$day]) // MySQL: DAYOFWEEK returns 1=Sun, so -1 gives 0=Sun
                ->whereIn('status', ['class', 'unavailable'])
                ->where('start_time', '<', $slotEnd)
                ->where('end_time', '>', $slotStart)
                ->exists();

            return !$hasBlocker;
        });

        // Return with color index
        $result = $available->values()->map(function ($assistant, $index) use ($itAssistants) {
            // Compute color index based on original sorted position
            $colorIndex = $itAssistants->search(fn($a) => $a->id === $assistant->id);
            return array_merge($assistant->toArray(), ['color_index' => $colorIndex]);
        });

        return response()->json(['data' => $result]);
    }
}
