<?php

namespace App\Http\Controllers\Api;

use App\Helpers\AuditLogger;
use App\Http\Controllers\Controller;
use App\Models\WirelessMicrophone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WirelessMicrophoneController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = WirelessMicrophone::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('brand_model', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%")
                  ->orWhere('frequency', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($request->filled('location')) {
            $query->where('location', $request->location);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $perPage = (int) $request->get('per_page', 50);
        $mics = $query->orderBy('brand_model', 'asc')->paginate($perPage);

        return response()->json($mics);
    }

    public function locations(): JsonResponse
    {
        $locations = WirelessMicrophone::distinct()
            ->whereNotNull('location')
            ->pluck('location')
            ->sort()
            ->values();

        return response()->json(['locations' => $locations]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'brand_model' => 'required|string|max:255',
            'type' => 'required|string|in:Digital,Analog',
            'channels_count' => 'required|integer|min:1|max:32',
            'channels' => 'required|array|min:1',
            'channels.*.channel_number' => 'required',
            'channels.*.frequency' => 'required|string',
            'location' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $freqParts = [];
        foreach ($validated['channels'] as $c) {
            $chNum = $c['channel_number'];
            $chFreq = $c['frequency'];
            $freqParts[] = "Ch{$chNum}: {$chFreq}";
        }
        $validated['frequency'] = implode(', ', $freqParts);

        $mic = WirelessMicrophone::create($validated);

        AuditLogger::log(
            'create',
            "Created {$mic->type} receiver {$mic->brand_model} with {$mic->channels_count} channels at {$mic->location}",
            $mic,
            null,
            $mic->toArray(),
            'AV-IT'
        );

        return response()->json([
            'message' => 'Receiver created successfully',
            'data' => $mic,
        ], 201);
    }

    public function show(WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        return response()->json(['data' => $wirelessMicrophone]);
    }

    public function update(Request $request, WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        $validated = $request->validate([
            'brand_model' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|in:Digital,Analog',
            'channels_count' => 'sometimes|required|integer|min:1|max:32',
            'channels' => 'sometimes|required|array|min:1',
            'channels.*.channel_number' => 'required',
            'channels.*.frequency' => 'required|string',
            'location' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $old = $wirelessMicrophone->toArray();

        if (isset($validated['channels'])) {
            $freqParts = [];
            foreach ($validated['channels'] as $c) {
                $chNum = $c['channel_number'];
                $chFreq = $c['frequency'];
                $freqParts[] = "Ch{$chNum}: {$chFreq}";
            }
            $validated['frequency'] = implode(', ', $freqParts);
        }

        $wirelessMicrophone->update($validated);

        AuditLogger::log(
            'update',
            "Updated receiver {$wirelessMicrophone->brand_model}",
            $wirelessMicrophone,
            $old,
            $wirelessMicrophone->toArray(),
            'AV-IT'
        );

        return response()->json([
            'message' => 'Receiver updated successfully',
            'data' => $wirelessMicrophone,
        ]);
    }

    public function destroy(WirelessMicrophone $wirelessMicrophone): JsonResponse
    {
        $old = $wirelessMicrophone->toArray();
        $wirelessMicrophone->delete();

        AuditLogger::log(
            'delete',
            "Deleted receiver {$old['brand_model']}",
            null,
            $old,
            null,
            'AV-IT'
        );

        return response()->json(['message' => 'Receiver deleted successfully']);
    }
}
