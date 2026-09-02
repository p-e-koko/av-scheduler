<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\MarketingAssignmentEquipment;
use App\Models\MarketingEquipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketingAssignmentEquipmentController extends Controller
{
    /**
     * List all equipment assigned to an assignment.
     */
    public function index(Assignment $assignment): JsonResponse
    {
        $equipment = $assignment->marketingEquipment()->withPivot('quantity_used')->get();
        return response()->json(['data' => $equipment]);
    }

    /**
     * Assign equipment to a marketing assignment, with conflict detection.
     */
    public function assign(Request $request, Assignment $assignment): JsonResponse
    {
        $validated = $request->validate([
            'equipment_ids'   => 'required|array|min:1',
            'equipment_ids.*' => 'uuid|exists:marketing_equipment,id',
            'quantity_used'   => 'nullable|integer|min:1',
        ]);

        $quantityUsed = $validated['quantity_used'] ?? 1;
        $conflicts    = [];

        foreach ($validated['equipment_ids'] as $equipmentId) {
            // Check for time overlap conflict
            if ($this->hasConflict($equipmentId, $assignment)) {
                $item       = MarketingEquipment::find($equipmentId);
                $conflicts[] = [
                    'equipment_id'   => $equipmentId,
                    'equipment_name' => $item?->name,
                ];
                continue;
            }

            // Attach (or sync) — ignore if already exists
            $assignment->marketingEquipment()->syncWithoutDetaching([
                $equipmentId => ['quantity_used' => $quantityUsed],
            ]);
        }

        if (!empty($conflicts)) {
            return response()->json([
                'message'   => 'Some equipment is already assigned to overlapping events.',
                'conflicts' => $conflicts,
            ], 409);
        }

        $this->log($request, 'assigned_marketing_equipment', [
            'assignment_id' => $assignment->id,
            'equipment_ids' => $validated['equipment_ids'],
        ]);

        return response()->json([
            'message' => 'Equipment assigned successfully.',
            'data'    => $assignment->marketingEquipment()->withPivot('quantity_used')->get(),
        ]);
    }

    /**
     * Unassign a specific equipment item from an assignment.
     */
    public function unassign(Request $request, Assignment $assignment, string $equipmentId): JsonResponse
    {
        $assignment->marketingEquipment()->detach($equipmentId);

        $this->log($request, 'unassigned_marketing_equipment', [
            'assignment_id' => $assignment->id,
            'equipment_id'  => $equipmentId,
        ]);

        return response()->json(['message' => 'Equipment unassigned.']);
    }

    // -------------------------------------------------------------------------
    // Conflict Detection
    // -------------------------------------------------------------------------

    /**
     * Check if equipmentId is already assigned to another assignment overlapping with $assignment's time.
     */
    private function hasConflict(string $equipmentId, Assignment $withAssignment): bool
    {
        return MarketingAssignmentEquipment::where('marketing_equipment_id', $equipmentId)
            ->where('assignment_id', '!=', $withAssignment->id)
            ->whereHas('assignment', function ($q) use ($withAssignment) {
                $q->where('event_start_datetime', '<', $withAssignment->event_end_datetime)
                  ->where('event_end_datetime', '>', $withAssignment->event_start_datetime);
            })
            ->exists();
    }

    /**
     * Check availability of specific equipment items for a proposed time window.
     * Used by the frontend to validate before creating an assignment.
     * POST /marketing-equipment/check-conflict
     */
    public function checkConflict(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'equipment_ids'      => 'required|array|min:1',
            'equipment_ids.*'    => 'uuid|exists:marketing_equipment,id',
            'start_datetime'     => 'required|date',
            'end_datetime'       => 'required|date|after:start_datetime',
            'exclude_assignment' => 'nullable|uuid',
        ]);

        $conflicts = [];
        foreach ($validated['equipment_ids'] as $equipmentId) {
            $query = MarketingAssignmentEquipment::where('marketing_equipment_id', $equipmentId)
                ->whereHas('assignment', function ($q) use ($validated) {
                    $q->where('event_start_datetime', '<', $validated['end_datetime'])
                      ->where('event_end_datetime', '>', $validated['start_datetime']);
                });

            if (!empty($validated['exclude_assignment'])) {
                $query->where('assignment_id', '!=', $validated['exclude_assignment']);
            }

            if ($query->exists()) {
                $item = MarketingEquipment::find($equipmentId);
                $conflicts[] = [
                    'equipment_id'   => $equipmentId,
                    'equipment_name' => $item?->name,
                ];
            }
        }

        return response()->json([
            'has_conflict' => !empty($conflicts),
            'conflicts'    => $conflicts,
        ]);
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
