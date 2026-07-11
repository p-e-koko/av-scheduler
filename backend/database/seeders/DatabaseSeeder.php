<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Always run role seeder to ensure roles/permissions exist
        $this->call(RolePermissionSeeder::class);

        $password = Hash::make('password'); // Default password is 'password'

        // 1. Admin User
        $adminEmail = 'pekkodev@gmail.com';
        if (!\App\Models\User::withTrashed()->where('email', $adminEmail)->exists()) {
             $admin = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $adminEmail,
                'name' => 'Admin User',
                'password' => $password,
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);
            $admin->assignRole('admin');
        }

        // 2. Coordinator User
        $coordEmail = 'panneikoko1221@gmail.com';
        if (!\App\Models\User::withTrashed()->where('email', $coordEmail)->exists()) {
            $coordinator = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $coordEmail,
                'name' => 'Coordinator User',
                'password' => $password,
                'role' => 'coordinator',
                'email_verified_at' => now(),
            ]);
            $coordinator->assignRole('coordinator');
        }

        // 3. Supervisor User
        $supEmail = 'supervisor@apiu.edu';
        if (!\App\Models\User::withTrashed()->where('email', $supEmail)->exists()) {
            $supervisor = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $supEmail,
                'name' => 'Supervisor User',
                'password' => $password,
                'role' => 'supervisor',
                'email_verified_at' => now(),
            ]);
            $supervisor->assignRole('supervisor');
        }

        // 4. Student User (Test User)
        $studEmail = '202300203@my.apiu.edu';
        if (!\App\Models\User::withTrashed()->where('email', $studEmail)->exists()) {
            $student = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $studEmail,
                'name' => 'Student User',
                'password' => $password,
                'role' => 'student',
                'email_verified_at' => now(),
            ]);
            $student->assignRole('student');
        }

        // 5. Customer User (Media booking test user)
        $customerEmail = 'customer@apiu.edu';
        if (!\App\Models\User::withTrashed()->where('email', $customerEmail)->exists()) {
            $customer = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $customerEmail,
                'name' => 'Customer User',
                'password' => $password,
                'role' => 'customer',
                'email_verified_at' => now(),
            ]);
            $customer->assignRole('customer');
        }
    }
}
