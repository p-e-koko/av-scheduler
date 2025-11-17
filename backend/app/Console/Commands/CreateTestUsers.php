<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateTestUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:users {--fresh : Delete existing test users first}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create test users for different roles to test RBAC system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if ($this->option('fresh')) {
            $this->info('Deleting existing test users...');
            User::whereIn('email', [
                'admin@test.com',
                'supervisor@test.com',
                'coordinator@test.com',
                'student@test.com'
            ])->forceDelete();
        }

        $this->info('Creating test users...');

        $users = [
            [
                'name' => 'Admin Test User',
                'email' => 'admin@test.com',
                'password' => 'password123',
                'role' => 'admin',
                'promised_hours_per_week' => 40.00,
                'remaining_hours_this_week' => 40.00,
            ],
            [
                'name' => 'Supervisor Test User',
                'email' => 'supervisor@test.com',
                'password' => 'password123',
                'role' => 'supervisor',
                'promised_hours_per_week' => 40.00,
                'remaining_hours_this_week' => 35.00,
            ],
            [
                'name' => 'Coordinator Test User',
                'email' => 'coordinator@test.com',
                'password' => 'password123',
                'role' => 'coordinator',
                'promised_hours_per_week' => 30.00,
                'remaining_hours_this_week' => 25.00,
            ],
            [
                'name' => 'Student Test User',
                'email' => 'student@test.com',
                'student_id' => 'STU001',
                'username' => 'student01',
                'password' => 'password123',
                'role' => 'student',
                'promised_hours_per_week' => 20.00,
                'remaining_hours_this_week' => 15.00,
            ],
        ];

        foreach ($users as $userData) {
            $user = User::create($userData);
            $this->info("✓ Created {$userData['role']}: {$userData['email']} (ID: {$user->id})");
        }

        $this->newLine();
        $this->info('🎯 Test Credentials:');
        $this->table(['Role', 'Email', 'Password'], [
            ['Admin', 'admin@test.com', 'password123'],
            ['Supervisor', 'supervisor@test.com', 'password123'],
            ['Coordinator', 'coordinator@test.com', 'password123'],
            ['Student', 'student@test.com', 'password123'],
        ]);

        $this->newLine();
        $this->info('🚀 Next Steps:');
        $this->line('1. Start server: php artisan serve');
        $this->line('2. Login via POST /api/auth/login');
        $this->line('3. Use token to test protected endpoints');
        $this->line('4. Check TESTING_GUIDE.md for detailed test cases');
    }
}
