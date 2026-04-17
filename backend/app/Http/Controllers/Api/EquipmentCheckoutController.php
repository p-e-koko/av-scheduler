<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\EquipmentCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipmentCheckoutController extends Controller
{
    /**
     * List all checkout records with optional filters.
     * All roles can view; only admin/coordinator/supervisor have write access (enforced in routes).
     */
    public function index(Request $request): JsonResponse
    {
        $query = EquipmentCheckout::with(['equipment', 'user']);

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->whereNull('returned_at');
            } elseif ($request->status === 'returned') {
                $query->whereNotNull('returned_at');
            }
        }

        // Filter by equipment
        if ($request->has('equipment_id')) {
            $query->where('equipment_id', $request->equipment_id);
        }

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range (checked_out_at)
        if ($request->has('date_from')) {
            $query->where('checked_out_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('checked_out_at', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('event_note', 'like', "%{$search}%")
                  ->orWhereHas('equipment', fn($eq) => $eq->where('name', 'like', "%{$search}%")->orWhere('barcode', 'like', "%{$search}%"))
                  ->orWhereHas('user', fn($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = $request->get('per_page', 20);
        $checkouts = $query->orderByDesc('checked_out_at')->paginate($perPage);

        return response()->json($checkouts);
    }

    /**
     * Display a single checkout record.
     */
    public function show(string $id): JsonResponse
    {
        $checkout = EquipmentCheckout::withTrashed()
            ->with(['equipment', 'user'])
            ->findOrFail($id);

        return response()->json(['checkout' => $checkout]);
    }

    /**
     * Update a checkout record (admin/coordinator/supervisor only).
     * If returned_at is modified the equipment status will be recalculated.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $checkout = EquipmentCheckout::findOrFail($id);

        $data = $request->validate([
            'event_note'     => 'sometimes|required|string|max:500',
            'return_note'    => 'nullable|string|max:500',
            'checked_out_at' => 'sometimes|required|date',
            'returned_at'    => 'nullable|date',
        ]);

        $wasActive = $checkout->isActive();
        $checkout->update($data);

        // Recalculate equipment status based on returned_at
        $equipment = $checkout->equipment;
        if ($equipment) {
            $hasActiveCheckout = EquipmentCheckout::where('equipment_id', $equipment->id)
                ->whereNull('returned_at')
                ->exists();

            $equipment->update(['status' => $hasActiveCheckout ? 'checked_out' : 'available']);
        }

        AuditLogger::log('equipment_checkout.updated', [
            'checkout_id'  => $checkout->id,
            'equipment_id' => $checkout->equipment_id,
            'barcode'      => $equipment?->barcode,
            'changes'      => $data,
        ]);

        return response()->json([
            'message'  => 'Checkout record updated successfully',
            'checkout' => $checkout->fresh(['equipment', 'user']),
        ]);
    }

    /**
     * Soft-delete a checkout record. If the checkout was active, reset equipment to available.
     */
    public function destroy(string $id): JsonResponse
    {
        $checkout = EquipmentCheckout::findOrFail($id);
        $equipment = $checkout->equipment;

        // If it's an active checkout, free the equipment
        if ($checkout->isActive() && $equipment) {
            $equipment->update(['status' => 'available']);
        }

        $checkout->delete();

        AuditLogger::log('equipment_checkout.deleted', [
            'checkout_id'  => $id,
            'equipment_id' => $checkout->equipment_id,
            'barcode'      => $equipment?->barcode,
        ]);

        return response()->json(['message' => 'Checkout record deleted (soft)']);
    }

    /**
     * List soft-deleted checkout records.
     */
    public function trashed(Request $request): JsonResponse
    {
        $query = EquipmentCheckout::onlyTrashed()->with(['equipment', 'user']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('event_note', 'like', "%{$search}%")
                  ->orWhereHas('equipment', fn($eq) => $eq->where('name', 'like', "%{$search}%"));
            });
        }

        $checkouts = $query->orderByDesc('deleted_at')->paginate(20);

        return response()->json($checkouts);
    }

    /**
     * Restore a soft-deleted checkout record.
     */
    public function restore(string $id): JsonResponse
    {
        $checkout = EquipmentCheckout::withTrashed()->findOrFail($id);
        $checkout->restore();

        // Recalculate equipment status after restore
        $equipment = $checkout->equipment;
        if ($equipment && $checkout->isActive()) {
            $equipment->update(['status' => 'checked_out']);
        }

        AuditLogger::log('equipment_checkout.restored', [
            'checkout_id'  => $id,
            'equipment_id' => $checkout->equipment_id,
        ]);

        return response()->json([
            'message'  => 'Checkout record restored successfully',
            'checkout' => $checkout->fresh(['equipment', 'user']),
        ]);
    }

    /**
     * Permanently delete a checkout record (admin only).
     */
    public function forceDelete(string $id): JsonResponse
    {
        $checkout = EquipmentCheckout::withTrashed()->findOrFail($id);
        $checkout->forceDelete();

        AuditLogger::log('equipment_checkout.force_deleted', [
            'checkout_id' => $id,
        ]);

        return response()->json(['message' => 'Checkout record permanently deleted']);
    }
}
