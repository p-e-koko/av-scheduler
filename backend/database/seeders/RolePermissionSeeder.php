<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // User management permissions
            'view users',
            'create users',
            'edit users',
            'delete users',
            'restore users',
            'force delete users',

            // Assignment management permissions
            'view assignments',
            'create assignments',
            'edit assignments',
            'delete assignments',
            'assign users to assignments',
            'check in users',
            'check out users',

            // Position management permissions
            'view positions',
            'create positions',
            'edit positions',
            'delete positions',
            'manage user positions',

            // Profile management
            'view own profile',
            'edit own profile',
            'upload profile picture',

            // Reporting permissions
            'view reports',
            'export reports',

            // System administration
            'manage system settings',
            'view system logs',

            // Media booking permissions
            'view media bookings',
            'create media bookings',
            'edit media bookings',
            'cancel media bookings',
            'view customer contact',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ], [
                'id' => (string) Str::uuid(),
            ]);
        }

        // Create roles and assign permissions

        // Admin role - has all permissions
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $adminRole->syncPermissions($permissions);

        // Supervisor role - can manage assignments and view users
        $supervisorRole = Role::firstOrCreate(
            ['name' => 'supervisor', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $supervisorRole->syncPermissions([
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
            'view media bookings',
            'view customer contact',
        ]);

        // Coordinator role - can create assignments and manage students
        $coordinatorRole = Role::firstOrCreate(
            ['name' => 'coordinator', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $coordinatorRole->syncPermissions([
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
            'view media bookings',
            'create media bookings',
            'edit media bookings',
            'cancel media bookings',
            'view customer contact',
        ]);

        // Student role - basic permissions
        $studentRole = Role::firstOrCreate(
            ['name' => 'student', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $studentRole->syncPermissions([
            'view assignments',
            'check in users',
            'check out users',
            'edit own profile',
            'upload profile picture',
        ]);

        // Customer role - media booking only
        $customerRole = Role::firstOrCreate(
            ['name' => 'customer', 'guard_name' => 'web'],
            ['id' => (string) Str::uuid()]
        );
        $customerRole->syncPermissions([
            'view own profile',
            'edit own profile',
            'view media bookings',
            'create media bookings',
            'edit media bookings',
            'cancel media bookings',
        ]);
    }
}
