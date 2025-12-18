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
        $admin = \App\Models\User::where('email', 'admin@apiu.edu')->first();
        if (!$admin) {
            $admin = new \App\Models\User();
            $admin->id = (string) \Illuminate\Support\Str::uuid();
            $admin->email = 'pekkodev@gmail.com';
            $admin->name = 'Admin User';
            $admin->save();
        }
        $admin->role = 'admin';
        $admin->email_verified_at = now();
        $admin->save(); // Save changes for existing users too
        $admin->assignRole('admin');

        // 2. Coordinator User
        $coordinator = \App\Models\User::where('email', 'coordinator@apiu.edu')->first();
        if (!$coordinator) {
            $coordinator = new \App\Models\User();
            $coordinator->id = (string) \Illuminate\Support\Str::uuid();
            $coordinator->email = 'panneikoko1221@gmail.com';
            $coordinator->name = 'Coordinator User';
            $coordinator->password = $password;
            $coordinator->save();
        }
        $coordinator->role = 'coordinator';
        $coordinator->email_verified_at = now();
        $coordinator->save();
        $coordinator->assignRole('coordinator');

        // 3. Supervisor User
        $supervisor = \App\Models\User::where('email', 'supervisor@apiu.edu')->first();
        if (!$supervisor) {
            $supervisor = new \App\Models\User();
            $supervisor->id = (string) \Illuminate\Support\Str::uuid();
            $supervisor->email = 'supervisor@apiu.edu';
            $supervisor->name = 'Supervisor User';
            $supervisor->password = $password;
            $supervisor->save();
        }
        $supervisor->role = 'supervisor';
        $supervisor->email_verified_at = now();
        $supervisor->save();
        $supervisor->assignRole('supervisor');

        // 4. Student User (Test User)
        $student = \App\Models\User::where('email', 'student@apiu.edu')->first();
        if (!$student) {
            $student = new \App\Models\User();
            $student->id = (string) \Illuminate\Support\Str::uuid();
            $student->email = '202300203@my.apiu.edu';
            $student->name = 'Student User';
            $student->password = $password;
            $student->save();
        }
        $student->role = 'student';
        $student->email_verified_at = now();
        $student->save();
        $student->assignRole('student');
    }
}
