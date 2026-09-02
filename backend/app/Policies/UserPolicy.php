<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     * Admin sees all. AV-IT management sees AV-IT users. Marketing management sees Marketing users.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            'admin',
            'coordinator', 'supervisor',
            'marketing_coordinator', 'marketing_supervisor',
        ]);
    }

    /**
     * Determine whether the user can view the model.
     * Admin sees all. Supervisors/Coordinators see users in same department, or own profile.
     */
    public function view(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return true;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        // AV-IT management can only view AV-IT users
        if ($user->hasAnyRole(['coordinator', 'supervisor'])) {
            return $model->isAvItDepartment();
        }

        // Marketing management can only view Marketing users
        if ($user->hasAnyRole(['marketing_coordinator', 'marketing_supervisor'])) {
            return $model->isMarketingDepartment();
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        if ($user->id === $model->id) {
            return true;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        // AV-IT management: can update AV-IT users
        if ($user->hasAnyRole(['coordinator', 'supervisor'])) {
            return $model->isAvItDepartment();
        }

        // Marketing management: can update Marketing users
        if ($user->hasAnyRole(['marketing_coordinator', 'marketing_supervisor'])) {
            return $model->isMarketingDepartment();
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return $user->hasRole('admin');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return $user->hasRole('admin');
    }
}
