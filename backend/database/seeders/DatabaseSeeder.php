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
        $user = \App\Models\User::where('email', 'test@example.com')->first();

        if (!$user) {
            $user = new \App\Models\User();
            $user->id = (string) \Illuminate\Support\Str::uuid();
            $user->email = 'test@example.com';
            $user->name = 'Test User';
            $user->role = 'student';
            $user->password = '$2y$12$KjG.d5.1.w.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1'; // Default password
            $user->save();
        }
        
        // Assign student role to test user
        $user->assignRole('student');
    }
}
