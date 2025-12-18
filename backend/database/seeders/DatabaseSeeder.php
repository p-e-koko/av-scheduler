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
            $admin->role = 'admin';
            $admin->password = $password;
            $admin->save();
        }
        $admin->assignRole('admin');

        // 2. Coordinator User
        $coordinator = \App\Models\User::where('email', 'coordinator@apiu.edu')->first();
        if (!$coordinator) {
            $coordinator = new \App\Models\User();
            $coordinator->id = (string) \Illuminate\Support\Str::uuid();
            $coordinator->email = 'panneikoko1221@gmail.com';
            $coordinator->name = 'Coordinator User';
            $coordinator->role = 'coordinator';
            $coordinator->password = $password;
            $coordinator->save();
        }
        $coordinator->assignRole('coordinator');

        // 3. Supervisor User
        $supervisor = \App\Models\User::where('email', 'supervisor@apiu.edu')->first();
        if (!$supervisor) {
            $supervisor = new \App\Models\User();
            $supervisor->id = (string) \Illuminate\Support\Str::uuid();
            $supervisor->email = 'supervisor@apiu.edu';
            $supervisor->name = 'Supervisor User';
            $supervisor->role = 'supervisor';
            $supervisor->password = $password;
            $supervisor->save();
        }
        $supervisor->assignRole('supervisor');

        // 4. Student User (Test User)
        $student = \App\Models\User::where('email', 'student@apiu.edu')->first();
        if (!$student) {
            $student = new \App\Models\User();
            $student->id = (string) \Illuminate\Support\Str::uuid();
            $student->email = '202300203@my.apiu.edu';
            $student->name = 'Student User';
            $student->role = 'student';
            $student->password = $password;
            $student->save();
        }
        $student->assignRole('student');
    }
}
