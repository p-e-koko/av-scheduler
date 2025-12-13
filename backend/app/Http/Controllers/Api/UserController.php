<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserCollection;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Helpers\AuditLogger;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Add filtering
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('student_id', 'like', "%{$search}%");
            });
        }

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->paginate($perPage);

        return response()->json(new UserCollection($users));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $userData = $request->validated();

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            $profilePicture = $request->file('profile_picture');
            $fileName = time() . '_' . uniqid() . '.' . $profilePicture->getClientOriginalExtension();
            $path = $profilePicture->storeAs('profile_pictures', $fileName, 'public');
            $userData['profile_picture'] = $path;
        }

        // Set remaining hours equal to promised hours for new users
        if (isset($userData['promised_hours_per_week'])) {
            $userData['remaining_hours_this_week'] = $userData['promised_hours_per_week'];
        }

        $user = User::create($userData);

        AuditLogger::log('User Created', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => new UserResource($user)
        ], 201);
    }

    /**
     * Store user with file support (alternative endpoint for file uploads).
     */
    public function storeWithFiles(StoreUserRequest $request): JsonResponse
    {
        $userData = $request->validated();

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            $profilePicture = $request->file('profile_picture');
            $fileName = time() . '_' . uniqid() . '.' . $profilePicture->getClientOriginalExtension();
            $path = $profilePicture->storeAs('profile_pictures', $fileName, 'public');
            $userData['profile_picture'] = $path;
        }

        // Set remaining hours equal to promised hours for new users
        if (isset($userData['promised_hours_per_week'])) {
            $userData['remaining_hours_this_week'] = $userData['promised_hours_per_week'];
        }

        $user = User::create($userData);

        AuditLogger::log('User Created', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => new UserResource($user)
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): JsonResponse
    {
        AuditLogger::log('User Details Viewed', ['viewed_user_id' => $user->id, 'viewed_user_email' => $user->email]);
        return response()->json([
            'user' => new UserResource($user)
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $userData = $request->validated();
        $oldRole = $user->role;

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            // Delete old profile picture if it exists
            $user->deleteProfilePicture();

            $profilePicture = $request->file('profile_picture');
            $fileName = time() . '_' . uniqid() . '.' . $profilePicture->getClientOriginalExtension();
            $path = $profilePicture->storeAs('profile_pictures', $fileName, 'public');
            $userData['profile_picture'] = $path;
        }

        $user->update($userData);

        // Always recalculate remaining hours for students to ensure consistency
        if ($user->role === 'student') {
            $this->recalculateRemainingHours($user);
        }

        AuditLogger::log('User Updated', ['user_id' => $user->id, 'email' => $user->email]);

        if (isset($userData['role']) && $userData['role'] !== $oldRole) {
             AuditLogger::log('User Role Changed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'old_role' => $oldRole,
                'new_role' => $userData['role']
            ]);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => new UserResource($user->fresh())
        ]);
    }

    /**
     * Update user with file support (alternative endpoint for file uploads).
     */
    public function updateWithFiles(UpdateUserRequest $request, User $user): JsonResponse
    {
        $userData = $request->validated();
        $oldRole = $user->role;

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            // Delete old profile picture if it exists
            $user->deleteProfilePicture();

            $profilePicture = $request->file('profile_picture');
            $fileName = time() . '_' . uniqid() . '.' . $profilePicture->getClientOriginalExtension();
            $path = $profilePicture->storeAs('profile_pictures', $fileName, 'public');
            $userData['profile_picture'] = $path;
        }

        $user->update($userData);

        // Always recalculate remaining hours for students to ensure consistency
        if ($user->role === 'student') {
            $this->recalculateRemainingHours($user);
        }

        AuditLogger::log('User Updated', ['user_id' => $user->id, 'email' => $user->email]);

        if (isset($userData['role']) && $userData['role'] !== $oldRole) {
             AuditLogger::log('User Role Changed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'old_role' => $oldRole,
                'new_role' => $userData['role']
            ]);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => new UserResource($user->fresh())
        ]);
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        AuditLogger::log('User Deleted (Soft)', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Restore a soft deleted user.
     */
    public function restore(string $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->restore();

        AuditLogger::log('User Restored', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'message' => 'User restored successfully',
            'user' => new UserResource($user)
        ]);
    }

    /**
     * Permanently delete a user.
     */
    public function forceDelete(string $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->forceDelete();

        AuditLogger::log('User Deleted (Permanent)', ['user_id' => $user->id, 'email' => $user->email]);

        return response()->json([
            'message' => 'User permanently deleted'
        ]);
    }

    /**
     * Get trashed users.
     */
    public function trashed(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 15);
        $users = User::onlyTrashed()->paginate($perPage);

        return response()->json(new UserCollection($users));
    }

    /**
     * Recalculate remaining hours for a user based on accepted assignments.
     */
    private function recalculateRemainingHours(User $user): void
    {
        // Get start and end of current week
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        // Get accepted assignments for this week
        $acceptedAssignments = $user->assignments()
            ->wherePivot('status', 'accepted')
            ->whereBetween('event_start_datetime', [$startOfWeek, $endOfWeek])
            ->get();

        $workedHours = 0;
        foreach ($acceptedAssignments as $assignment) {
            $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
            $workedHours += $duration;
        }

        $user->remaining_hours_this_week = max(0, $user->promised_hours_per_week - $workedHours);
        $user->save();
    }
}
