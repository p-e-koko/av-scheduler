<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentController extends Controller
{
    /**
     * Display a listing of all equipment.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Equipment::with(['currentCheckout.user']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('location')) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 20);
        $equipment = $query->orderBy('name')->paginate($perPage);

        return response()->json($equipment);
    }

    /**
     * Create new equipment and auto-generate its barcode.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'category'      => 'required|string|max:255',
            'location'      => 'required|string|max:255',
            'purchase_date' => 'nullable|date',
            'condition'     => 'nullable|in:good,fair,poor',
        ]);

        $data['barcode'] = Equipment::generateBarcode($data['location']);
        $data['status']  = 'available';

        $equipment = Equipment::create($data);

        AuditLogger::log('equipment.created', [
            'equipment_id' => $equipment->id,
            'name'         => $equipment->name,
            'barcode'      => $equipment->barcode,
        ]);

        return response()->json([
            'message'   => 'Equipment created successfully',
            'equipment' => $equipment,
        ], 201);
    }

    /**
     * Display the specified equipment.
     */
    public function show(Equipment $equipment): JsonResponse
    {
        $equipment->load(['currentCheckout.user']);

        return response()->json(['equipment' => $equipment]);
    }

    /**
     * Lookup equipment by barcode (used during scan).
     */
    public function scan(string $barcode): JsonResponse
    {
        $equipment = Equipment::where('barcode', $barcode)
            ->with(['currentCheckout.user'])
            ->first();

        if (!$equipment) {
            return response()->json(['message' => 'Equipment not found for this barcode'], 404);
        }

        return response()->json(['equipment' => $equipment]);
    }

    /**
     * Update the specified equipment.
     */
    public function update(Request $request, Equipment $equipment): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'category'      => 'sometimes|required|string|max:255',
            'location'      => 'sometimes|required|string|max:255',
            'purchase_date' => 'nullable|date',
            'condition'     => 'nullable|in:good,fair,poor',
            'status'        => 'nullable|in:available,checked_out,maintenance',
        ]);

        $equipment->update($data);

        AuditLogger::log('equipment.updated', [
            'equipment_id' => $equipment->id,
            'name'         => $equipment->name,
            'barcode'      => $equipment->barcode,
        ]);

        return response()->json([
            'message'   => 'Equipment updated successfully',
            'equipment' => $equipment->fresh(['currentCheckout.user']),
        ]);
    }

    /**
     * Soft delete the specified equipment.
     */
    public function destroy(Equipment $equipment): JsonResponse
    {
        $equipment->delete();

        AuditLogger::log('equipment.deleted', [
            'equipment_id' => $equipment->id,
            'name'         => $equipment->name,
            'barcode'      => $equipment->barcode,
        ]);

        return response()->json(['message' => 'Equipment deleted successfully']);
    }

    /**
     * Scan a barcode to check out equipment.
     * Any authenticated user can check out equipment that is available.
     */
    public function checkout(Request $request, string $barcode): JsonResponse
    {
        $data = $request->validate([
            'event_note' => 'required|string|max:500',
        ]);

        $equipment = Equipment::where('barcode', $barcode)->first();

        if (!$equipment) {
            return response()->json(['message' => 'Equipment not found for this barcode'], 404);
        }

        if (!$equipment->isAvailable()) {
            $checkout = $equipment->currentCheckout()->with('user')->first();
            return response()->json([
                'message'   => 'Equipment is not available',
                'status'    => $equipment->status,
                'held_by'   => $checkout?->user?->name,
                'event_note' => $checkout?->event_note,
            ], 422);
        }

        $user = auth()->user();

        $checkout = EquipmentCheckout::create([
            'equipment_id'   => $equipment->id,
            'user_id'        => $user->id,
            'event_note'     => $data['event_note'],
            'checked_out_at' => now(),
        ]);

        $equipment->update(['status' => 'checked_out']);

        AuditLogger::log('equipment.checked_out', [
            'equipment_id' => $equipment->id,
            'barcode'      => $equipment->barcode,
            'name'         => $equipment->name,
            'event_note'   => $data['event_note'],
            'checkout_id'  => $checkout->id,
        ]);

        return response()->json([
            'message'   => "Equipment checked out successfully to {$user->name}",
            'checkout'  => $checkout->load('equipment', 'user'),
        ]);
    }

    /**
     * Scan a barcode to return equipment.
     * Only the user who checked it out can return it.
     */
    public function return(Request $request, string $barcode): JsonResponse
    {
        $data = $request->validate([
            'return_note' => 'nullable|string|max:500',
        ]);

        $equipment = Equipment::where('barcode', $barcode)->first();

        if (!$equipment) {
            return response()->json(['message' => 'Equipment not found for this barcode'], 404);
        }

        if (!$equipment->isCheckedOut()) {
            return response()->json(['message' => 'This equipment is not currently checked out'], 422);
        }

        $activeCheckout = $equipment->currentCheckout;

        if (!$activeCheckout) {
            return response()->json(['message' => 'No active checkout found for this equipment'], 404);
        }

        // Only the person who checked it out can return it
        if ($activeCheckout->user_id !== auth()->id()) {
            $holder = $activeCheckout->user()->first();
            return response()->json([
                'message' => 'Only the person who checked out this equipment can return it',
                'held_by' => $holder?->name,
            ], 403);
        }

        $activeCheckout->update([
            'returned_at' => now(),
            'return_note' => $data['return_note'] ?? null,
        ]);

        $equipment->update(['status' => 'available']);

        AuditLogger::log('equipment.returned', [
            'equipment_id' => $equipment->id,
            'barcode'      => $equipment->barcode,
            'name'         => $equipment->name,
            'checkout_id'  => $activeCheckout->id,
            'returned_at'  => now()->toISOString(),
        ]);

        return response()->json([
            'message'  => 'Equipment returned successfully',
            'checkout' => $activeCheckout->fresh(['equipment', 'user']),
        ]);
    }

    /**
     * Get checkout history for a specific piece of equipment.
     */
    public function history(Equipment $equipment): JsonResponse
    {
        $history = $equipment->checkouts()
            ->withTrashed()
            ->with('user')
            ->orderByDesc('checked_out_at')
            ->get();

        return response()->json([
            'equipment' => $equipment,
            'history'   => $history,
        ]);
    }

    /**
     * Get equipment currently held by the authenticated user.
     */
    public function myEquipment(): JsonResponse
    {
        $user = auth()->user();

        $checkouts = EquipmentCheckout::where('user_id', $user->id)
            ->whereNull('returned_at')
            ->with('equipment')
            ->orderByDesc('checked_out_at')
            ->get();

        return response()->json(['checkouts' => $checkouts]);
    }

    /**
     * Get trashed (soft-deleted) equipment.
     */
    public function trashed(Request $request): JsonResponse
    {
        $query = Equipment::onlyTrashed();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $equipment = $query->orderBy('deleted_at', 'desc')->paginate(20);

        return response()->json($equipment);
    }

    /**
     * Restore a soft-deleted piece of equipment.
     */
    public function restore(string $id): JsonResponse
    {
        $equipment = Equipment::withTrashed()->findOrFail($id);
        $equipment->restore();

        AuditLogger::log('equipment.restored', [
            'equipment_id' => $equipment->id,
            'barcode'      => $equipment->barcode,
        ]);

        return response()->json([
            'message'   => 'Equipment restored successfully',
            'equipment' => $equipment,
        ]);
    }

    /**
     * Permanently delete equipment.
     */
    public function forceDelete(string $id): JsonResponse
    {
        $equipment = Equipment::withTrashed()->findOrFail($id);
        $equipment->forceDelete();

        AuditLogger::log('equipment.force_deleted', [
            'equipment_id' => $id,
        ]);

        return response()->json(['message' => 'Equipment permanently deleted']);
    }
}
