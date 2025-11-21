<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Availability\StoreAvailabilityRequest;
use App\Http\Requests\Availability\UpdateAvailabilityRequest;
use App\Http\Resources\AvailabilityCollection;
use App\Http\Resources\AvailabilityResource;
use App\Models\Availability;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Availability::with('user');

        // Filter by student if provided
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by specific date
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $availability = $query->orderBy('date', 'asc')
                             ->orderBy('start_time', 'asc')
                             ->paginate($perPage);

        return response()->json(new AvailabilityCollection($availability));
    }

    /**
     * Get current user's availability (for students).
     */
    public function myAvailability(Request $request): JsonResponse
    {
        $query = Availability::where('student_id', $request->user()->id);

        // Filter by date range
        if ($request->has('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by specific date
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $availability = $query->orderBy('date', 'asc')
                             ->orderBy('start_time', 'asc')
                             ->paginate($perPage);

        return response()->json(new AvailabilityCollection($availability));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAvailabilityRequest $request): JsonResponse
    {
        $availabilityData = $request->validated();

        // Set student_id to current user if not provided (for students)
        if (!isset($availabilityData['student_id'])) {
            $availabilityData['student_id'] = $request->user()->id;
        }

        $availability = Availability::create($availabilityData);
        $availability->load('user');

        return response()->json([
            'message' => 'Availability created successfully',
            'availability' => new AvailabilityResource($availability)
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Availability $availability): JsonResponse
    {
        $availability->load('user');

        return response()->json([
            'availability' => new AvailabilityResource($availability)
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAvailabilityRequest $request, Availability $availability): JsonResponse
    {
        $availabilityData = $request->validated();
        $availability->update($availabilityData);
        $availability->load('user');

        return response()->json([
            'message' => 'Availability updated successfully',
            'availability' => new AvailabilityResource($availability->fresh(['user']))
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Availability $availability): JsonResponse
    {
        $availability->delete();

        return response()->json([
            'message' => 'Availability deleted successfully'
        ]);
    }

    /**
     * Get availability schedule for a specific date range.
     */
    public function schedule(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'string|exists:users,id',
        ]);

        $query = Availability::with('user')
            ->where('date', '>=', $request->date_from)
            ->where('date', '<=', $request->date_to);

        if ($request->has('student_ids') && !empty($request->student_ids)) {
            $query->whereIn('student_id', $request->student_ids);
        }

        $availability = $query->orderBy('date', 'asc')
                             ->orderBy('start_time', 'asc')
                             ->get()
                             ->groupBy(['date', 'student_id']);

        return response()->json([
            'schedule' => $availability,
            'date_from' => $request->date_from,
            'date_to' => $request->date_to
        ]);
    }

    /**
     * Bulk create availability slots.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'availability' => 'required|array|min:1',
            'availability.*.student_id' => 'nullable|string|exists:users,id',
            'availability.*.date' => 'required|date',
            'availability.*.start_time' => 'required|date_format:H:i:s',
            'availability.*.end_time' => 'required|date_format:H:i:s|after:availability.*.start_time',
            'availability.*.status' => 'required|in:available,unavailable,class',
        ]);

        $availabilityData = $request->input('availability');
        $created = [];

        foreach ($availabilityData as $data) {
            // Set student_id to current user if not provided (for students)
            if (!isset($data['student_id'])) {
                $data['student_id'] = $request->user()->id;
            }

            $availability = Availability::create($data);
            $availability->load('user');
            $created[] = new AvailabilityResource($availability);
        }

        return response()->json([
            'message' => 'Availability slots created successfully',
            'availability' => $created,
            'count' => count($created)
        ], 201);
    }
}
