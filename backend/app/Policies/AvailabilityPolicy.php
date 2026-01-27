<?php

namespace App\Policies;

use App\Models\Availability;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AvailabilityPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Supervisors, coordinators, and admins can view all availability
        return $user->hasAnyRole(['supervisor', 'coordinator', 'admin']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Availability $availability): bool
    {
        // Supervisors, coordinators, and admins can view all
        if ($user->hasAnyRole(['supervisor', 'coordinator', 'admin'])) {
            return true;
        }

        // Students can only view their own availability
        if ($user->hasRole('student')) {
            return $user->id === $availability->student_id;
        }

        return $user->id === $availability->student_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Students, coordinators, and admins can create availability
        return $user->hasAnyRole(['student', 'coordinator', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Availability $availability): bool
    {
        \Illuminate\Support\Facades\Log::info('AvailabilityPolicy update check', [
            'user_id' => $user->id,
            'user_roles' => $user->getRoleNames(),
            'availability_student_id' => $availability->student_id,
            'match' => $user->id === $availability->student_id
        ]);

        // Coordinators and admins can update any availability
        if ($user->hasAnyRole(['coordinator', 'admin'])) {
            return true;
        }

        // Users can update their own availability
        return $user->id === $availability->student_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Availability $availability): bool
    {
        // Coordinators and admins can delete any availability
        if ($user->hasAnyRole(['coordinator', 'admin'])) {
            return true;
        }

        // Users can delete their own availability
        return $user->id === $availability->student_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Availability $availability): bool
    {
        // Only coordinators and admins can restore availability
        return $user->hasAnyRole(['coordinator', 'admin']);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Availability $availability): bool
    {
        // Only coordinators and admins can force delete availability
        return $user->hasAnyRole(['coordinator', 'admin']);
    }
}
