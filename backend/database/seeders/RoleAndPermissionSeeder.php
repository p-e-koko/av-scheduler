<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
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
            // User Management
            'view users',
            'create users',
            'edit users',
            'delete users',
            'restore users',
            'force delete users',

            // Profile Management
            'view own profile',
            'edit own profile',

            // Skills Management
            'view skills',
            'create skills',
            'edit skills',
            'delete skills',
            'assign skills',

            // Assignment Management
            'view assignments',
            'create assignments',
            'edit assignments',
            'delete assignments',
            'assign users to assignments',
            'check in assignments',
            'view own assignments',

            // Availability Management
            'view availability',
            'create availability',
            'edit availability',
            'delete availability',
            'view own availability',
            'edit own availability',

            // System Administration
            'access admin panel',
            'manage system settings',
            'view reports',
            'export data',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions

        // Student Role
        $studentRole = Role::create(['name' => 'student']);
        $studentRole->givePermissionTo([
            'view own profile',
            'edit own profile',
            'view skills',
            'view own assignments',
            'check in assignments',
            'view own availability',
            'edit own availability',
        ]);

        // Coordinator Role
        $coordinatorRole = Role::create(['name' => 'coordinator']);
        $coordinatorRole->givePermissionTo([
            'view users',
            'view own profile',
            'edit own profile',
            'view skills',
            'create skills',
            'edit skills',
            'assign skills',
            'view assignments',
            'create assignments',
            'edit assignments',
            'delete assignments',
            'assign users to assignments',
            'view availability',
        ]);

        // Supervisor Role
        $supervisorRole = Role::create(['name' => 'supervisor']);
        $supervisorRole->givePermissionTo([
            'view users',
            'create users',
            'edit users',
            'view own profile',
            'edit own profile',
            'view skills',
            'create skills',
            'edit skills',
            'delete skills',
            'assign skills',
            'view assignments',
            'view availability',
            'view reports',
            'export data',
        ]);

        // Admin Role - User Management Only
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo([
            'view users',
            'create users',
            'edit users',
            'delete users',
            'restore users',
            'force delete users',
            'view own profile',
            'edit own profile',
            'access admin panel',
            'manage system settings',
        ]);

        // Customer Role - Media Booking Only
        $customerRole = Role::firstOrCreate(['name' => 'customer']);
        $customerRole->givePermissionTo([
            'view own profile',
            'edit own profile',
        ]);

        $this->command->info('Roles and permissions created successfully!');
        $this->command->info('Created roles: student, coordinator, supervisor, admin, customer');
        $this->command->info('Created ' . count($permissions) . ' permissions');
    }
}
