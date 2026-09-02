<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Str;

class MarketingRolesSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Marketing Supervisor Role
        $marketingSupervisorRole = Role::firstOrCreate(
            ['name' => 'marketing_supervisor', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $marketingSupervisorPermissions = [
            'view users',
            'view assignments',
            'create assignments',
            'edit assignments',
            'delete assignments',
            'assign users to assignments',
            'check in users',
            'check out users',
            'view reports',
            'edit own profile',
            'upload profile picture',
        ];

        foreach ($marketingSupervisorPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web'], ['id' => (string) Str::uuid()]);
        }
        $marketingSupervisorRole->syncPermissions($marketingSupervisorPermissions);

        // 2. Marketing Coordinator Role
        $marketingCoordinatorRole = Role::firstOrCreate(
            ['name' => 'marketing_coordinator', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $marketingCoordinatorPermissions = [
            'view users',
            'create users',
            'edit users',
            'view assignments',
            'create assignments',
            'edit assignments',
            'assign users to assignments',
            'check in users',
            'check out users',
            'view positions',
            'create positions',
            'edit positions',
            'delete positions',
            'manage user positions',
            'view reports',
            'edit own profile',
            'upload profile picture',
        ];
        
        foreach ($marketingCoordinatorPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web'], ['id' => (string) Str::uuid()]);
        }
        $marketingCoordinatorRole->syncPermissions($marketingCoordinatorPermissions);

        // 3. Student Ambassador Role
        $studentAmbassadorRole = Role::firstOrCreate(
            ['name' => 'student_ambassador', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $studentAmbassadorPermissions = [
            'view assignments',
            'check in users',
            'check out users',
            'edit own profile',
            'upload profile picture',
        ];
        foreach ($studentAmbassadorPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web'], ['id' => (string) Str::uuid()]);
        }
        $studentAmbassadorRole->syncPermissions($studentAmbassadorPermissions);
        
        // Ensure customer role exists too (sometimes missed from early seeders)
        $customerRole = Role::firstOrCreate(
            ['name' => 'customer', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $customerPermissions = [
            'view own profile',
            'edit own profile',
            'view media bookings',
            'create media bookings',
            'edit media bookings',
            'cancel media bookings',
        ];
        foreach ($customerPermissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web'], ['id' => (string) Str::uuid()]);
        }
        $customerRole->syncPermissions($customerPermissions);
    }
}
