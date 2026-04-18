<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\Cable;
use App\Models\CableCheckout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CableController extends Controller
{
    /**
     * Display a listing of cables.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Cable::query();

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
        $cables = $query->orderBy('name')->paginate($perPage);

        return response()->json($cables);
    }

    /**
     * Store a newly created cable.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'length'        => 'required|string|max:255',
            'amount'        => 'required|integer|min:0',
            'category'      => 'nullable|string|max:255',
            'location'      => 'required|string|max:255',
            'purchase_date' => 'nullable|date',
            'condition'     => 'nullable|in:good,fair,poor',
        ]);

        $data['barcode'] = Cable::generateBarcode($data['location']);
        $cable = Cable::create($data);

        AuditLogger::log('cable.created', [
            'cable_id' => $cable->id,
            'name'     => $cable->name,
            'barcode'  => $cable->barcode,
            'amount'   => $cable->amount,
        ]);

        return response()->json([
            'message' => 'Cable created successfully',
            'cable'   => $cable,
        ], 201);
    }

    /**
     * Display the specified cable.
     */
    public function show(Cable $cable): JsonResponse
    {
        return response()->json(['cable' => $cable]);
    }

    /**
     * Update the specified cable.
     */
    public function update(Request $request, Cable $cable): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'length'        => 'sometimes|required|string|max:255',
            'amount'        => 'sometimes|required|integer|min:0',
            'category'      => 'nullable|string|max:255',
            'location'      => 'sometimes|required|string|max:255',
            'purchase_date' => 'nullable|date',
            'condition'     => 'nullable|in:good,fair,poor',
        ]);

        $cable->update($data);

        AuditLogger::log('cable.updated', [
            'cable_id' => $cable->id,
            'name'     => $cable->name,
            'barcode'  => $cable->barcode,
        ]);

        return response()->json([
            'message' => 'Cable updated successfully',
            'cable'   => $cable,
        ]);
    }

    /**
     * Remove the specified cable.
     */
    public function destroy(Cable $cable): JsonResponse
    {
        $cable->delete();

        AuditLogger::log('cable.deleted', [
            'cable_id' => $cable->id,
            'name'     => $cable->name,
            'barcode'  => $cable->barcode,
        ]);

        return response()->json(['message' => 'Cable deleted successfully']);
    }

    /**
     * Scan a cable by barcode.
     */
    public function scan(string $barcode): JsonResponse
    {
        $cable = Cable::where('barcode', $barcode)->first();

        if (!$cable) {
            return response()->json(['message' => 'Cable not found'], 404);
        }

        $activeCheckouts = $cable->checkouts()
            ->where('user_id', auth()->id())
            ->whereNull('returned_at')
            ->get();

        return response()->json([
            'cable'            => $cable,
            'active_checkouts' => $activeCheckouts,
        ]);
    }

    /**
     * Checkout cables.
     */
    public function checkout(Request $request, string $barcode): JsonResponse
    {
        $data = $request->validate([
            'quantity'   => 'required|integer|min:1',
            'event_note' => 'required|string|max:500',
        ]);

        $cable = Cable::where('barcode', $barcode)->first();

        if (!$cable) {
            return response()->json(['message' => 'Cable not found for this barcode'], 404);
        }

        if ($cable->amount < $data['quantity']) {
            return response()->json([
                'message'   => 'Not enough cables available',
                'available' => $cable->amount,
            ], 422);
        }

        $user = auth()->user();

        $checkout = CableCheckout::create([
            'cable_id'             => $cable->id,
            'user_id'              => $user->id,
            'quantity_checked_out' => $data['quantity'],
            'event_note'           => $data['event_note'],
            'checked_out_at'       => now(),
        ]);

        $cable->decrement('amount', $data['quantity']);

        AuditLogger::log('cable.checked_out', [
            'cable_id'    => $cable->id,
            'barcode'     => $cable->barcode,
            'quantity'    => $data['quantity'],
            'checkout_id' => $checkout->id,
        ]);

        return response()->json([
            'message'  => "{$data['quantity']} cables checked out successfully",
            'checkout' => $checkout->load('cable', 'user'),
        ]);
    }

    /**
     * Return cables.
     */
    public function return(Request $request, string $barcode): JsonResponse
    {
        $data = $request->validate([
            'checkout_id' => 'required|uuid',
            'return_note' => 'nullable|string|max:500',
        ]);

        $cable = Cable::where('barcode', $barcode)->first();

        if (!$cable) {
            return response()->json(['message' => 'Cable not found for this barcode'], 404);
        }

        $checkout = CableCheckout::where('id', $data['checkout_id'])
            ->where('cable_id', $cable->id)
            ->whereNull('returned_at')
            ->first();

        if (!$checkout) {
            return response()->json(['message' => 'Active checkout record not found'], 404);
        }

        // Only the person who checked it out can return it (or admin/coordinator?)
        // The original EquipmentController had this check:
        if ($checkout->user_id !== auth()->id() && !auth()->user()->hasRole('admin', 'coordinator')) {
             return response()->json(['message' => 'Unauthorized to return this checkout'], 403);
        }

        $checkout->update([
            'returned_at' => now(),
            'return_note' => $data['return_note'] ?? null,
        ]);

        $cable->increment('amount', $checkout->quantity_checked_out);

        AuditLogger::log('cable.returned', [
            'cable_id'    => $cable->id,
            'barcode'     => $cable->barcode,
            'quantity'    => $checkout->quantity_checked_out,
            'checkout_id' => $checkout->id,
        ]);

        return response()->json([
            'message' => 'Cables returned successfully',
            'cable'   => $cable->fresh(),
        ]);
    }

    /**
     * Get checkout history for a specific cable.
     */
    public function history(Cable $cable): JsonResponse
    {
        $history = $cable->checkouts()
            ->withTrashed()
            ->with('user')
            ->orderByDesc('checked_out_at')
            ->get();

        return response()->json([
            'cable'   => $cable,
            'history' => $history,
        ]);
    }

    /**
     * Get trashed (soft-deleted) cables.
     */
    public function trashed(Request $request): JsonResponse
    {
        $query = Cable::onlyTrashed();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $cables = $query->orderBy('deleted_at', 'desc')->paginate(20);

        return response()->json($cables);
    }

    /**
     * Permanently delete cable.
     */
    public function forceDelete(string $id): JsonResponse
    {
        $cable = Cable::withTrashed()->findOrFail($id);
        $cable->forceDelete();

        AuditLogger::log('cable.force_deleted', [
            'cable_id' => $id,
        ]);

        return response()->json(['message' => 'Cable permanently deleted']);
    }

    /**
     * Get all unique locations currently in use for cables.
     */
    public function locations(): JsonResponse
    {
        $locations = Cable::select('location')
            ->distinct()
            ->orderBy('location')
            ->pluck('location');

        return response()->json(['locations' => $locations]);
    }
}
