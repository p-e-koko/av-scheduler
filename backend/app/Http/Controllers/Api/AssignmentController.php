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
use App\Helpers\AuditLogger;
use Illuminate\Support\Facades\Mail;
use App\Mail\AssignmentAssigned;
use App\Mail\AssignmentStatusUpdated;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;

class AssignmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        // Auto-complete past assignments
        Assignment::where('status', '!=', 'complete')
            ->where('event_end_datetime', '<', now())
            ->update(['status' => 'complete']);

        // Auto-confirm assignments where all users have accepted
        $assignmentsToConfirm = Assignment::where('status', 'pending')
            ->whereHas('users')
            ->whereDoesntHave('users', function ($q) {
                $q->where('assignment_users.status', '!=', 'accepted');
            })
            ->pluck('id');

        if ($assignmentsToConfirm->isNotEmpty()) {
            Assignment::whereIn('id', $assignmentsToConfirm)->update(['status' => 'confirmed']);
        }

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

        AuditLogger::log('Assignment Created', ['assignment_id' => $assignment->id, 'name' => $assignment->assignment_name]);

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

        AuditLogger::log('Assignment Updated', ['assignment_id' => $assignment->id, 'name' => $assignment->assignment_name]);

        // Reset all users status to pending
        foreach ($assignment->users as $user) {
            $assignment->updateUserStatus($user, 'pending');
        }

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

        AuditLogger::log('Assignment Deleted (Soft)', ['assignment_id' => $assignment->id, 'name' => $assignment->assignment_name]);

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

        AuditLogger::log('Assignment Restored', ['assignment_id' => $assignment->id, 'name' => $assignment->assignment_name]);

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

        AuditLogger::log('Assignment Deleted (Permanent)', ['assignment_id' => $assignment->id, 'name' => $assignment->assignment_name]);

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
            'status' => 'nullable|in:pending,accepted,rejected,completed'
        ]);

        // Check if user is already assigned
        if ($assignment->users()->where('user_id', $request->user_id)->exists()) {
            return response()->json([
                'message' => 'User is already assigned to this assignment'
            ], 422);
        }

        $status = $request->get('status', 'pending');
        $user = \App\Models\User::find($request->user_id);

        $assignment->assignUser(
            $user,
            $status,
            $request->position
        );

        if ($status === 'accepted') {
            $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
            $user->remaining_hours_this_week = max(0, $user->remaining_hours_this_week - $duration);
            $user->save();
        }

        $assignedUser = $user;
        $assignedUser->notify(new \App\Notifications\AssignmentAssignedNotification($assignment));

        AuditLogger::log('User Assigned to Assignment', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'assigned_user_id' => $request->user_id
        ]);

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

        // Check previous status to restore hours if needed
        $currentStatus = $assignment->users()->where('user_id', $user->id)->first()->pivot->status;

        $assignment->unassignUser($user);

        // If previously accepted, restore hours
        if ($currentStatus === 'accepted') {
            $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
            $user->remaining_hours_this_week = min($user->promised_hours_per_week, $user->remaining_hours_this_week + $duration);
            $user->save();
        }

        AuditLogger::log('User Unassigned from Assignment', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'unassigned_user_id' => $request->user_id
        ]);

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
        // Check if user has permission to manage positions
        if (!auth()->user()->hasRole('coordinator')) {
            return response()->json([
                'message' => 'Only coordinators can manage user positions'
            ], 403);
        }

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

        AuditLogger::log('User Position Updated in Assignment', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'user_id' => $request->user_id,
            'new_position' => $request->position
        ]);

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

        AuditLogger::log('User Checked In', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'user_id' => $request->user_id
        ]);

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

        AuditLogger::log('User Checked Out', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'user_id' => $request->user_id
        ]);

        // Load relationships for response
        $assignment->load(['creator', 'users']);

        return response()->json([
            'message' => 'User checked out successfully',
            'assignment' => new AssignmentResource($assignment)
        ]);
    }

    /**
     * Accept an assignment.
     */
    public function acceptAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $user = auth()->user();

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'You are not assigned to this assignment'
            ], 422);
        }

        $assignment->updateUserStatus($user, 'accepted');

        // Calculate duration in hours and update remaining hours
        $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
        $user->remaining_hours_this_week = max(0, $user->remaining_hours_this_week - $duration);
        $user->save();

        // Check if all assigned users have accepted
        $allAccepted = $assignment->users()->wherePivot('status', '!=', 'accepted')->doesntExist();
        if ($allAccepted && $assignment->users()->count() > 0) {
            $assignment->update(['status' => 'confirmed']);
        }

        // Notify coordinator
        if ($assignment->creator) {
            $assignment->creator->notify(new \App\Notifications\AssignmentAcceptedNotification($assignment, $user));
        }

        AuditLogger::log('Assignment Accepted', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name
        ]);

        return response()->json([
            'message' => 'Assignment accepted successfully',
            'assignment' => new AssignmentResource($assignment->load(['creator', 'users']))
        ]);
    }

    /**
     * Reject an assignment.
     */
    public function rejectAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $user = auth()->user();

        // Check if user is assigned
        if (!$assignment->users()->where('user_id', $user->id)->exists()) {
            return response()->json([
                'message' => 'You are not assigned to this assignment'
            ], 422);
        }

        // Check previous status to restore hours if needed
        $currentStatus = $assignment->users()->where('user_id', $user->id)->first()->pivot->status;

        $assignment->updateUserStatus($user, 'rejected', $request->reason);

        // If previously accepted, restore hours
        if ($currentStatus === 'accepted') {
            $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
            $user->remaining_hours_this_week = min($user->promised_hours_per_week, $user->remaining_hours_this_week + $duration);
            $user->save();
        }

        // Notify coordinator
        if ($assignment->creator) {
            $assignment->creator->notify(new \App\Notifications\AssignmentRejectedNotification($assignment, $user));
        }

        AuditLogger::log('Assignment Rejected', [
            'assignment_id' => $assignment->id,
            'assignment_name' => $assignment->assignment_name,
            'reason' => $request->reason
        ]);

        return response()->json([
            'message' => 'Assignment rejected successfully',
            'assignment' => new AssignmentResource($assignment->load(['creator', 'users']))
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

    public function addToCalendar(Request $request, Assignment $assignment)
    {
        $user = $request->user();
        file_put_contents(storage_path('logs/debug_google.log'), date('Y-m-d H:i:s') . " AddToCalendar: User " . $user->id . " Token: " . ($user->google_access_token ? 'Present' : 'Missing') . " Refresh: " . ($user->google_refresh_token ? 'Present' : 'Missing') . "\n", FILE_APPEND);
        \Illuminate\Support\Facades\Log::info('AddToCalendar: User ' . $user->id . ' Token: ' . ($user->google_access_token ? 'Present' : 'Missing'));

        // Check if user is assigned to this assignment
        $pivot = $assignment->users()->where('user_id', $user->id)->first();
        if (!$pivot) {
            return response()->json(['message' => 'You are not assigned to this assignment'], 403);
        }

        // Check if already added
        if ($pivot->pivot->google_event_id) {
             return response()->json(['message' => 'Already added to calendar'], 400);
        }

        // Check Google Tokens
        if (!$user->google_access_token && !$user->google_refresh_token) {
            return response()->json(['message' => 'Google account not connected', 'code' => 'GOOGLE_NOT_CONNECTED'], 400);
        }

        $client = new GoogleClient();
        $client->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));

        $accessToken = [
            'access_token' => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
            'created' => $user->updated_at->timestamp, // Approximate
            'expires_in' => $user->google_token_expires_at ? $user->google_token_expires_at->diffInSeconds(now()) : 3600,
        ];

        $client->setAccessToken($accessToken);

        if ($client->isAccessTokenExpired()) {
            if ($user->google_refresh_token) {
                try {
                    $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                    $newToken = $client->getAccessToken();
                    $user->google_access_token = $newToken['access_token'];
                    $user->save();
                } catch (\Exception $e) {
                     \Illuminate\Support\Facades\Log::error('Google Token Refresh Failed: ' . $e->getMessage());
                     return response()->json(['message' => 'Google session expired', 'code' => 'GOOGLE_NOT_CONNECTED'], 400);
                }
            } else {
                 return response()->json(['message' => 'Google session expired', 'code' => 'GOOGLE_NOT_CONNECTED'], 400);
            }
        }

        $service = new GoogleCalendar($client);

        $startDateTime = \Carbon\Carbon::parse($assignment->event_start_datetime)->format('Y-m-d\TH:i:s');
        $endDateTime = \Carbon\Carbon::parse($assignment->event_end_datetime)->format('Y-m-d\TH:i:s');

        $event = new GoogleCalendar\Event([
            'summary' => $assignment->assignment_name,
            'description' => $assignment->description,
            'location' => $assignment->event_location,
            'start' => ['dateTime' => $startDateTime, 'timeZone' => 'Asia/Bangkok'],
            'end' => ['dateTime' => $endDateTime, 'timeZone' => 'Asia/Bangkok'],
        ]);

        try {
            $createdEvent = $service->events->insert('primary', $event);
            $assignment->users()->updateExistingPivot($user->id, ['google_event_id' => $createdEvent->id]);
            return response()->json(['message' => 'Added to calendar', 'google_event_id' => $createdEvent->id]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to add to calendar: ' . $e->getMessage()], 500);
        }
    }

    public function removeFromCalendar(Request $request, Assignment $assignment)
    {
        $user = $request->user();

        $pivot = $assignment->users()->where('user_id', $user->id)->first();
        if (!$pivot || !$pivot->pivot->google_event_id) {
            return response()->json(['message' => 'Event not found in calendar'], 404);
        }

        // Check Google Tokens
        if (!$user->google_access_token) {
             return response()->json(['message' => 'Google account not connected', 'code' => 'GOOGLE_NOT_CONNECTED'], 400);
        }

        $client = new GoogleClient();
        $client->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setAccessToken([
            'access_token' => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
        ]);

        if ($client->isAccessTokenExpired()) {
             if ($user->google_refresh_token) {
                $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
                $user->google_access_token = $client->getAccessToken()['access_token'];
                $user->save();
            } else {
                 return response()->json(['message' => 'Google session expired', 'code' => 'GOOGLE_NOT_CONNECTED'], 400);
            }
        }

        $service = new GoogleCalendar($client);

        try {
            $service->events->delete('primary', $pivot->pivot->google_event_id);
            $assignment->users()->updateExistingPivot($user->id, ['google_event_id' => null]);
            return response()->json(['message' => 'Removed from calendar']);
        } catch (\Exception $e) {
             if ($e->getCode() == 404) {
                $assignment->users()->updateExistingPivot($user->id, ['google_event_id' => null]);
                return response()->json(['message' => 'Removed from calendar (was already deleted from Google)']);
             }
            return response()->json(['message' => 'Failed to remove from calendar: ' . $e->getMessage()], 500);
        }
    }
}
