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
        $user = \App\Models\User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'role' => 'student'
        ]);
        
        // Assign student role to test user
        $user->assignRole('student');
    }
}
