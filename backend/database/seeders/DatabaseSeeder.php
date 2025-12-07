<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed roles and permissions first (only if not exists)
        if (!\Spatie\Permission\Models\Role::where('name', 'student')->exists()) {
            $this->call(RolePermissionSeeder::class);
        }

        // Create test user with UUID
        $user = \App\Models\User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'role' => 'student',
                'password' => '$2y$12$KjG.d5.1.w.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', // You might want to set a default password here if creating
            ]
        );
        
        // Assign student role to test user
        $user->assignRole('student');
    }
}
