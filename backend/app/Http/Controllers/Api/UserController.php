<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserCollection;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Helpers\AuditLogger;

class UserController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->select('users.*');

        if ($request->has('role')) {
            $role = $request->role;
            // Use whereRaw to force UUID casting for Postgres compatibility
            // model_has_roles.model_id is varchar, users.id is uuid
            $query->whereRaw("exists (select * from \"model_has_roles\" where \"model_has_roles\".\"model_id\"::uuid = \"users\".\"id\" and \"model_has_roles\".\"role_id\" in (select \"id\" from \"roles\" where \"name\" = ?))", [$role]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                  ->orWhere('users.email', 'like', "%{$search}%")
                  ->orWhere('users.username', 'like', "%{$search}%")
                  ->orWhere('users.student_id', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_approved')) {
            $isApproved = filter_var($request->input('is_approved'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (!is_null($isApproved)) {
                $query->where('is_approved', $isApproved);
            }
        }

        // Add pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->orderBy('users.created_at', 'desc')->paginate($perPage);

        return response()->json(new UserCollection($users));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

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

        $this->applyRoles($user, $userData['roles'] ?? null, $userData['role'] ?? null);

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
        $this->authorize('create', User::class);

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

        $this->applyRoles($user, $userData['roles'] ?? null, $userData['role'] ?? null);

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
        $this->authorize('view', $user);
        
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
        // Authorize the request
        $this->authorize('update', $user);

        $userData = $request->validated();
        
        // Prevent non-admins from updating sensitive fields
        if (!$request->user()->hasRole('admin')) {
            unset($userData['role']);
            unset($userData['roles']);
            unset($userData['student_id']); // Prevent changing student ID
        }

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

        if (isset($userData['roles']) || isset($userData['role'])) {
            $this->applyRoles($user, $userData['roles'] ?? null, $userData['role'] ?? null);
        }

        if (array_key_exists('is_approved', $userData) && $userData['is_approved'] === true) {
            $existingNonCustomerRoles = array_values(array_diff($user->getRoleNames()->toArray(), ['customer']));
            if (empty($existingNonCustomerRoles)) {
                $this->applyRoles($user, ['student']);
            }
        }

        // Refresh model to get updated role
        $user->refresh();

        // Always recalculate remaining hours for students to ensure consistency
        if ($user->hasRole('student') || $user->role === 'student') {
            $this->recalculateRemainingHours($user);
        }

        AuditLogger::log('User Updated', ['user_id' => $user->id, 'email' => $user->email]);

        if ((isset($userData['role']) && $userData['role'] !== $oldRole) || isset($userData['roles'])) {
             AuditLogger::log('User Role Changed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'old_role' => $oldRole,
                'new_roles' => $user->getRoleNames()
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
        // Authorize the request
        $this->authorize('update', $user);

        $userData = $request->validated();
        
        // Prevent non-admins from updating sensitive fields
        if (!$request->user()->hasRole('admin')) {
            unset($userData['role']);
            unset($userData['roles']);
            unset($userData['student_id']); // Prevent changing student ID
        }

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

        if ($request->has('roles') || $request->has('role')) {
            $this->applyRoles($user, $request->input('roles'), $request->input('role'));
        }

        if ($request->boolean('is_approved') && empty(array_diff($user->getRoleNames()->toArray(), ['customer']))) {
            $this->applyRoles($user, ['student']);
        }

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

    private function applyRoles(User $user, ?array $roles = null, ?string $role = null): void
    {
        $normalizedRoles = [];

        if (is_array($roles)) {
            $normalizedRoles = array_values(array_filter($roles, fn ($value) => is_string($value) && $value !== ''));
        } elseif (is_string($roles) && $roles !== '') {
            $normalizedRoles = [$roles];
        }

        if ($role && $role !== '') {
            $normalizedRoles[] = $role;
        }

        $normalizedRoles[] = 'customer';
        $normalizedRoles = array_values(array_unique($normalizedRoles));

        $user->syncRoles($normalizedRoles);

        $primaryRole = collect($normalizedRoles)->first(fn ($value) => $value !== 'customer') ?? 'customer';
        $user->role = $primaryRole;
        $user->save();
    }

    private function ensureCustomerRole(User $user): void
    {
        if (!$user->hasRole('customer')) {
            $user->assignRole('customer');
        }

        if (!$user->role) {
            $user->role = 'customer';
            $user->save();
        }
    }

    /**
     * Remove the specified resource from storage (soft delete).
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

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
        $this->authorize('restore', $user);
        
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
        $this->authorize('forceDelete', $user);

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
        $this->authorize('viewAny', User::class); // Only admins/coords can see list, effectively just admins due to whereTrashed usually

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

    /**
     * Get all IT Assistants (users where is_IT = true).
     */
    public function getITAssistants(Request $request): JsonResponse
    {
        $assistants = User::where('is_IT', true)
            ->orderBy('created_at')
            ->get();

        // Attach color_index based on sorted position
        $result = $assistants->values()->map(function ($assistant, $index) {
            return array_merge($assistant->toArray(), ['color_index' => $index]);
        });

        return response()->json(['data' => $result]);
    }
}


