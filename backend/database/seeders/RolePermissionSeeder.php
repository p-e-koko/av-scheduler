<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

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
            'edit own profile',
            'upload profile picture',

            // Reporting permissions
            'view reports',
            'export reports',

            // System administration
            'manage system settings',
            'view system logs',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ], [
                'id' => (string) \Illuminate\Support\Str::uuid(),
            ]);
        }

        // Create roles and assign permissions

        // Admin role - has all permissions
        $adminRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'admin',
            'guard_name' => 'web'
        ]);
        $adminRole->givePermissionTo(Permission::all());

        // Supervisor role - can manage assignments and view users
        $supervisorRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'supervisor',
            'guard_name' => 'web'
        ]);
        $supervisorRole->givePermissionTo([
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
        ]);

        // Coordinator role - can create assignments and manage students
        $coordinatorRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'coordinator',
            'guard_name' => 'web'
        ]);
        $coordinatorRole->givePermissionTo([
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
        ]);

        // Student role - basic permissions
        $studentRole = Role::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'student',
            'guard_name' => 'web'
        ]);
        $studentRole->givePermissionTo([
            'view assignments',
            'check in users',
            'check out users',
            'edit own profile',
            'upload profile picture',
        ]);
    }
}
