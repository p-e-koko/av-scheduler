<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\WirelessMicrophone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WirelessMicrophoneController extends Controller
{
    /**
     * List all wireless microphones with optional search and location filter.
     */
    public function index(Request $request): JsonResponse
    {
        $query = WirelessMicrophone::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('brand_model', 'like', "%{$search}%")
                  ->orWhere('frequency', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        if ($request->has('location') && $request->location) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        $perPage = $request->get('per_page', 50);
        $microphones = $query->orderBy('brand_model')->paginate($perPage);

        return response()->json($microphones);
    }

    /**
     * Store a new wireless microphone.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brand_model' => 'required|string|max:255',
            'frequency'   => 'required|string|max:255',
            'location'    => 'required|string|max:255',
            'notes'       => 'nullable|string|max:1000',
        ]);

        $mic = WirelessMicrophone::create($data);

        AuditLogger::log('wireless_mic.created', [
            'mic_id'      => $mic->id,
            'brand_model' => $mic->brand_model,
            'frequency'   => $mic->frequency,
        ]);

        return response()->json([
            'message'    => 'Wireless microphone added successfully',
            'microphone' => $mic,
        ], 201);
    }

    /**
     * Show a single wireless microphone.
     */
    public function show(WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        return response()->json(['microphone' => $wirelessMicrophone]);
    }

    /**
     * Update a wireless microphone.
     */
    public function update(Request $request, WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        $data = $request->validate([
            'brand_model' => 'sometimes|required|string|max:255',
            'frequency'   => 'sometimes|required|string|max:255',
            'location'    => 'sometimes|required|string|max:255',
            'notes'       => 'nullable|string|max:1000',
        ]);

        $wirelessMicrophone->update($data);

        AuditLogger::log('wireless_mic.updated', [
            'mic_id'      => $wirelessMicrophone->id,
            'brand_model' => $wirelessMicrophone->brand_model,
        ]);

        return response()->json([
            'message'    => 'Wireless microphone updated successfully',
            'microphone' => $wirelessMicrophone->fresh(),
        ]);
    }

    /**
     * Soft delete a wireless microphone.
     */
    public function destroy(WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        $wirelessMicrophone->delete();

        AuditLogger::log('wireless_mic.deleted', [
            'mic_id'      => $wirelessMicrophone->id,
            'brand_model' => $wirelessMicrophone->brand_model,
        ]);

        return response()->json(['message' => 'Wireless microphone deleted successfully']);
    }

    /**
     * Get all unique locations.
     */
    public function locations(): JsonResponse
    {
        $locations = WirelessMicrophone::select('location')
            ->distinct()
            ->orderBy('location')
            ->pluck('location');

        return response()->json(['locations' => $locations]);
    }
}
