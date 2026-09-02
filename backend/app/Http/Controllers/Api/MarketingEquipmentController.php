<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MarketingEquipment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class MarketingEquipmentController extends Controller
{
    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    public function index(Request $request): JsonResponse
    {
        $query = MarketingEquipment::withTrashed(false);

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('model', 'like', '%' . $request->search . '%')
                  ->orWhere('category', 'like', '%' . $request->search . '%')
                  ->orWhere('serial_number', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Enrich with real-time in_use flag based on active assignments
        $items = $query->orderBy('name')->get()->map(function ($item) {
            $item->is_currently_in_use = $item->isCurrentlyInUse();
            return $item;
        });

        return response()->json(['data' => $items]);
    }

    public function show(MarketingEquipment $marketingEquipment): JsonResponse
    {
        $marketingEquipment->is_currently_in_use = $marketingEquipment->isCurrentlyInUse();
        return response()->json(['data' => $marketingEquipment]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'model'         => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255|unique:marketing_equipment,serial_number',
            'category'      => 'nullable|string|max:100',
            'quantity'      => 'nullable|integer|min:1',
            'description'   => 'nullable|string',
            'status'        => 'nullable|in:available,in_use,maintenance',
        ]);

        $item = MarketingEquipment::create($validated);

        $this->log($request, 'created_marketing_equipment', [
            'equipment_id'   => $item->id,
            'equipment_name' => $item->name,
        ]);

        return response()->json(['data' => $item, 'message' => 'Equipment created.'], 201);
    }

    public function update(Request $request, MarketingEquipment $marketingEquipment): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'model'         => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255|unique:marketing_equipment,serial_number,' . $marketingEquipment->id,
            'category'      => 'nullable|string|max:100',
            'quantity'      => 'nullable|integer|min:1',
            'description'   => 'nullable|string',
            'status'        => 'nullable|in:available,in_use,maintenance',
        ]);

        $marketingEquipment->update($validated);

        $this->log($request, 'updated_marketing_equipment', [
            'equipment_id'   => $marketingEquipment->id,
            'equipment_name' => $marketingEquipment->name,
        ]);

        return response()->json(['data' => $marketingEquipment, 'message' => 'Equipment updated.']);
    }

    public function destroy(Request $request, MarketingEquipment $marketingEquipment): JsonResponse
    {
        $this->log($request, 'deleted_marketing_equipment', [
            'equipment_id'   => $marketingEquipment->id,
            'equipment_name' => $marketingEquipment->name,
        ]);

        $marketingEquipment->delete();
        return response()->json(['message' => 'Equipment removed.']);
    }

    public function restore(Request $request, string $id): JsonResponse
    {
        $item = MarketingEquipment::withTrashed()->findOrFail($id);
        $item->restore();

        $this->log($request, 'restored_marketing_equipment', ['equipment_id' => $item->id]);
        return response()->json(['data' => $item, 'message' => 'Equipment restored.']);
    }

    public function trashed(): JsonResponse
    {
        $items = MarketingEquipment::onlyTrashed()->orderBy('deleted_at', 'desc')->get();
        return response()->json(['data' => $items]);
    }

    // -------------------------------------------------------------------------
    // History
    // -------------------------------------------------------------------------

    /**
     * Return the full assignment history for this equipment item,
     * plus its current status and upcoming scheduled assignments.
     */
    public function history(MarketingEquipment $marketingEquipment): JsonResponse
    {
        $now = now();

        $assignments = $marketingEquipment->assignments()
            ->withPivot('quantity_used')
            ->orderBy('event_start_datetime', 'desc')
            ->get()
            ->map(function ($assignment) use ($now) {
                $assignment->is_current = $assignment->event_start_datetime <= $now
                    && $assignment->event_end_datetime >= $now;
                $assignment->is_upcoming = $assignment->event_start_datetime > $now;
                return $assignment;
            });

        $currentStatus = $marketingEquipment->isCurrentlyInUse()
            ? 'Currently Using'
            : ucfirst($marketingEquipment->status);

        return response()->json([
            'data' => [
                'equipment'      => $marketingEquipment,
                'current_status' => $currentStatus,
                'assignments'    => $assignments,
            ],
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
