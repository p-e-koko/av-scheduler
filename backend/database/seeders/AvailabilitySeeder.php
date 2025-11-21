<?php

namespace Database\Seeders;

use App\Models\Availability;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class AvailabilitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all students
        $students = User::where('role', 'student')->get();

        if ($students->isEmpty()) {
            $this->command->info('No students found. Creating sample student...');

            $student = User::create([
                'name' => 'Test Student',
                'email' => 'test.student@university.edu',
                'password' => bcrypt('password123'),
                'role' => 'student',
                'student_id' => 'STU001',
                'username' => 'test.student',
                'promised_hours_per_week' => 10,
            ]);

            $students = collect([$student]);
        }

        // Create availability for the next 7 days for each student
        foreach ($students->take(3) as $student) { // Limit to 3 students for testing
            $this->command->info("Creating availability for student: {$student->name}");

            for ($day = 0; $day < 7; $day++) {
                $date = Carbon::now()->addDays($day)->format('Y-m-d');

                // Morning availability (8:00 AM - 12:00 PM) - Available
                Availability::create([
                    'student_id' => $student->id,
                    'date' => $date,
                    'start_time' => '08:00:00',
                    'end_time' => '12:00:00',
                    'status' => 'available',
                ]);

                // Afternoon class (1:00 PM - 3:00 PM) - Class
                Availability::create([
                    'student_id' => $student->id,
                    'date' => $date,
                    'start_time' => '13:00:00',
                    'end_time' => '15:00:00',
                    'status' => 'class',
                ]);

                // Evening availability (4:00 PM - 8:00 PM) - Available
                Availability::create([
                    'student_id' => $student->id,
                    'date' => $date,
                    'start_time' => '16:00:00',
                    'end_time' => '20:00:00',
                    'status' => 'available',
                ]);
            }
        }

        $this->command->info('Availability seeder completed successfully!');
    }
}
