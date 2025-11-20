<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assignment\StoreAssignmentRequest;
use App\Http\Requests\Assignment\UpdateAssignmentRequest;
use App\Http\Resources\AssignmentCollection;
use App\Http\Resources\AssignmentResource;
use App\Models\Assignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Assignment::with(['creator', 'users']);

        // Add filtering by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Add filtering by creator
        if ($request->has('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        // Add date range filtering
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->inDateRange($request->start_date, $request->end_date);
        }

        // Add filtering for upcoming assignments
        if ($request->has('upcoming') && $request->boolean('upcoming')) {
            $query->upcoming();
        }

        // Add filtering for past assignments
        if ($request->has('past') && $request->boolean('past')) {
            $query->past();
        }

        // Add search functionality
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('assignment_name', 'like', "%{$search}%")
                  ->orWhere('event_name', 'like', "%{$search}%")
                  ->orWhere('event_location', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Add sorting
        $sortBy = $request->get('sort_by', 'event_start_datetime');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $assignments = $query->paginate($perPage);

        return response()->json(new AssignmentCollection($assignments));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAssignmentRequest $request): JsonResponse
    {
        $assignmentData = $request->validated();
        $assignmentData['created_by'] = auth()->id();

        $assignment = Assignment::create($assignmentData);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'Assignment created successfully',
            'assignment' => new AssignmentResource($assignment)
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Assignment $assignment): JsonResponse
    {
        // Load relationships
        $assignment->load(['creator', 'users']);

        return response()->json([
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAssignmentRequest $request, Assignment $assignment): JsonResponse
    {
        $assignmentData = $request->validated();

        $assignment->update($assignmentData);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'Assignment updated successfully',
            'assignment' => new AssignmentResource($assignment->fresh(['creator', 'users']))
        ]);
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(Assignment $assignment): JsonResponse
    {
        $assignment->delete();

        return response()->json([
            'message' => 'Assignment deleted successfully'
        ]);
    }

    /**
     * Restore a soft deleted assignment.
     */
    public function restore(string $id): JsonResponse
    {
        $assignment = Assignment::withTrashed()->findOrFail($id);
        $assignment->restore();

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'Assignment restored successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Permanently delete an assignment.
     */
    public function forceDelete(string $id): JsonResponse
    {
        $assignment = Assignment::withTrashed()->findOrFail($id);
        $assignment->forceDelete();

        return response()->json([
            'message' => 'Assignment permanently deleted'
        ]);
    }

    /**
     * Get trashed assignments.
     */
    public function trashed(Request $request): JsonResponse
    {
        $query = Assignment::onlyTrashed()->with(['creator', 'users']);

        // Add search functionality for trashed items
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('assignment_name', 'like', "%{$search}%")
                  ->orWhere('event_name', 'like', "%{$search}%")
                  ->orWhere('event_location', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $assignments = $query->paginate($perPage);

        return response()->json(new AssignmentCollection($assignments));
    }

    /**
     * Assign a user to an assignment.
     */
    public function assignUser(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'nullable|string|max:255',
            'status' => 'nullable|in:assigned,completed'
        ]);

        // Check if user is already assigned
        if ($assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is already assigned to this assignment'
            ], 422);
        }

        $assignment->assignUser(
            \App\Models\User::find($request->user_id),
            $request->get('status', 'assigned'),
            $request->position
        );

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User assigned successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Remove a user from an assignment.
     */
    public function unassignUser(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $user = \App\Models\User::find($request->user_id);

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is not assigned to this assignment'
            ], 422);
        }

        $assignment->unassignUser($user);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User unassigned successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Update user's position in an assignment.
     */
    public function updateUserPosition(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string|max:255'
        ]);

        $user = \App\Models\User::find($request->user_id);

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is not assigned to this assignment'
            ], 422);
        }

        $assignment->updateUserPosition($user, $request->position);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User position updated successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Check in a user for an assignment.
     */
    public function checkInUser(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $user = \App\Models\User::find($request->user_id);

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is not assigned to this assignment'
            ], 422);
        }

        $assignment->checkInUser($user);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User checked in successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Check out a user from an assignment.
     */
    public function checkOutUser(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id'
        ]);

        $user = \App\Models\User::find($request->user_id);

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is not assigned to this assignment'
            ], 422);
        }

        $assignment->checkOutUser($user);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User checked out successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Get assignments for the authenticated user.
     */
    public function myAssignments(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = $user->assignments()->with(['creator']);

        // Add filtering by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Add filtering for upcoming assignments
        if ($request->has('upcoming') && $request->boolean('upcoming')) {
            $query->upcoming();
        }

        // Add filtering for past assignments
        if ($request->has('past') && $request->boolean('past')) {
            $query->past();
        }

        // Add sorting
        $sortBy = $request->get('sort_by', 'event_start_datetime');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $assignments = $query->paginate($perPage);

        return response()->json(new AssignmentCollection($assignments));
    }
}
