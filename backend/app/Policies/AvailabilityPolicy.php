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
        // Supervisors and coordinators can view all availability
        return in_array($user->role, ['supervisor', 'coordinator']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Availability $availability): bool
    {
        // Supervisors and coordinators can view all
        if (in_array($user->role, ['supervisor', 'coordinator'])) {
            return true;
        }

        // Students can only view their own availability
        if ($user->role === 'student') {
            return $user->id === $availability->student_id;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Students and coordinators can create availability
        return in_array($user->role, ['student', 'coordinator']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Availability $availability): bool
    {
        \Illuminate\Support\Facades\Log::info('AvailabilityPolicy update check', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'availability_student_id' => $availability->student_id,
            'match' => $user->id === $availability->student_id
        ]);

        // Coordinators can update any availability
        if ($user->role === 'coordinator') {
            return true;
        }

        // Students can only update their own availability
        if ($user->role === 'student') {
            return $user->id === $availability->student_id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Availability $availability): bool
    {
        // Coordinators can delete any availability
        if ($user->role === 'coordinator') {
            return true;
        }

        // Students can only delete their own availability
        if ($user->role === 'student') {
            return $user->id === $availability->student_id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Availability $availability): bool
    {
        // Only coordinators can restore availability
        return $user->role === 'coordinator';
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Availability $availability): bool
    {
        // Only coordinators can force delete availability
        return $user->role === 'coordinator';
    }
}
