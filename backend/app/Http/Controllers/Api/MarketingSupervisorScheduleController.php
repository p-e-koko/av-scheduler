<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MarketingSupervisorSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MarketingSupervisorScheduleController extends Controller
{
    /**
     * List schedule entries.
     * - marketing_supervisor sees own entries.
     * - Admin, marketing_coordinator, student_ambassador: see all.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = MarketingSupervisorSchedule::with('supervisor:id,name,profile_picture');

        // Supervisors only see their own schedule when querying without a filter,
        // but we want everyone in the marketing department to see all schedules
        // for transparency. Supervisors can still filter to their own.
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $entries = $query->orderBy('start_datetime')->get();
        return response()->json(['data' => $entries]);
    }

    public function show(MarketingSupervisorSchedule $marketingSupervisorSchedule): JsonResponse
    {
        $marketingSupervisorSchedule->load('supervisor:id,name,profile_picture');
        return response()->json(['data' => $marketingSupervisorSchedule]);
    }

    /**
     * Create a new schedule entry (marketing_supervisor only).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'start_datetime' => 'required|date',
            'end_datetime'   => 'required|date|after:start_datetime',
            'notes'          => 'nullable|string',
        ]);

        $validated['user_id'] = $user->id;

        $entry = MarketingSupervisorSchedule::create($validated);

        $this->log($request, 'created_supervisor_schedule', ['schedule_id' => $entry->id]);

        return response()->json(['data' => $entry, 'message' => 'Schedule entry created.'], 201);
    }

    /**
     * Bulk upload schedule entries from an array (used for CSV/manual multi-import).
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'entries'                  => 'required|array|min:1',
            'entries.*.title'          => 'required|string|max:255',
            'entries.*.start_datetime' => 'required|date',
            'entries.*.end_datetime'   => 'required|date',
            'entries.*.notes'          => 'nullable|string',
        ]);

        $created = [];
        foreach ($validated['entries'] as $entry) {
            $entry['user_id'] = $user->id;
            $created[] = MarketingSupervisorSchedule::create($entry);
        }

        $this->log($request, 'bulk_uploaded_supervisor_schedule', [
            'count' => count($created),
        ]);

        return response()->json(['data' => $created, 'message' => count($created) . ' entries uploaded.'], 201);
    }

    public function update(Request $request, MarketingSupervisorSchedule $marketingSupervisorSchedule): JsonResponse
    {
        $validated = $request->validate([
            'title'          => 'sometimes|required|string|max:255',
            'start_datetime' => 'sometimes|required|date',
            'end_datetime'   => 'sometimes|required|date|after:start_datetime',
            'notes'          => 'nullable|string',
        ]);

        $marketingSupervisorSchedule->update($validated);
        $this->log($request, 'updated_supervisor_schedule', ['schedule_id' => $marketingSupervisorSchedule->id]);

        return response()->json(['data' => $marketingSupervisorSchedule, 'message' => 'Schedule entry updated.']);
    }

    public function destroy(Request $request, MarketingSupervisorSchedule $marketingSupervisorSchedule): JsonResponse
    {
        $this->log($request, 'deleted_supervisor_schedule', ['schedule_id' => $marketingSupervisorSchedule->id]);
        $marketingSupervisorSchedule->delete();
        return response()->json(['message' => 'Schedule entry deleted.']);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function log(Request $request, string $action, array $details = []): void
    {
        $user = $request->user();
        if (!$user) return;

        AuditLog::create([
            'user_id'    => $user->id,
            'user_name'  => $user->name,
            'role'       => $user->role,
            'department' => 'marketing',
            'action'     => $action,
            'details'    => $details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
