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
        $admin = \App\Models\User::withTrashed()->where('email', 'pekkodev@gmail.com')->first();
        if (!$admin) {
            $admin = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => 'pekkodev@gmail.com',
                'name' => 'Admin User',
                'password' => $password,
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);
        } else {
            $admin->restore();
            $admin->update([
                'name' => 'Admin User',
                'password' => $password,
                'role' => 'admin',
                'email_verified_at' => now(),
            ]);
        }
        $admin->assignRole('admin');

        // 2. Coordinator User
        $coordinator = \App\Models\User::withTrashed()->where('email', 'panneikoko1221@gmail.com')->first();
        if (!$coordinator) {
            $coordinator = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => 'panneikoko1221@gmail.com',
                'name' => 'Coordinator User',
                'password' => $password,
                'role' => 'coordinator',
                'email_verified_at' => now(),
            ]);
        } else {
             $coordinator->restore();
             $coordinator->update([
                'name' => 'Coordinator User',
                'password' => $password,
                'role' => 'coordinator',
                'email_verified_at' => now(),
            ]);
        }
        $coordinator->assignRole('coordinator');

        // 3. Supervisor User
        $supervisor = \App\Models\User::withTrashed()->where('email', 'supervisor@apiu.edu')->first();
        if (!$supervisor) {
            $supervisor = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => 'supervisor@apiu.edu',
                'name' => 'Supervisor User',
                'password' => $password,
                'role' => 'supervisor',
                'email_verified_at' => now(),
            ]);
        } else {
            $supervisor->restore();
            $supervisor->update([
                'name' => 'Supervisor User',
                'password' => $password,
                'role' => 'supervisor',
                'email_verified_at' => now(),
            ]);
        }
        $supervisor->assignRole('supervisor');

        // 4. Student User (Test User)
        $student = \App\Models\User::withTrashed()->where('email', '202300203@my.apiu.edu')->first();
        if (!$student) {
            $student = \App\Models\User::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => '202300203@my.apiu.edu',
                'name' => 'Student User',
                'password' => $password,
                'role' => 'student',
                'email_verified_at' => now(),
            ]);
        } else {
            $student->restore();
            $student->update([
                'name' => 'Student User',
                'password' => $password,
                'role' => 'student',
                'email_verified_at' => now(),
            ]);
        }
        $student->assignRole('student');
    }
}
