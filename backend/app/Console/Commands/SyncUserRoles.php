<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class SyncUserRoles extends Command
{
    protected $signature = 'app:sync-user-roles
                            {email? : User email to sync (defaults to pekkodev@gmail.com dev admin)}
                            {--all-staff-roles : Assign admin, coordinator, supervisor, and student roles}';

    protected $description = 'Sync Spatie roles in model_has_roles for a user';

    public function handle(): int
    {
        $email = $this->argument('email') ?? 'pekkodev@gmail.com';

        $user = User::withTrashed()->where('email', $email)->first();
        if (!$user) {
            $this->error("User not found: {$email}");
            return self::FAILURE;
        }

        if ($this->option('all-staff-roles')) {
            $roles = ['admin', 'coordinator', 'supervisor', 'student'];
        } elseif ($user->role) {
            $roles = [$user->role];
        } else {
            $this->error('User has no role column value and --all-staff-roles was not passed.');
            return self::FAILURE;
        }

        $user->syncRoles($roles);

        $this->info("Synced Spatie roles for {$email}: " . $user->getRoleNames()->join(', '));

        return self::SUCCESS;
    }
}
