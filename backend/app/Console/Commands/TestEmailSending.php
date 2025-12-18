<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use App\Models\User;
use App\Notifications\VerifyEmailQueued;

class TestEmailSending extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email-sending {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email sending functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $this->info("Environment: " . app()->environment());
        
        try {
            // Manually creating the notification to ensure we hit the right class
            $notification = new VerifyEmailQueued();
            $user = new User();
            $user->email = $email;
            $user->name = 'Test User';
            $user->id = 99999;
            
            $user->notify($notification);
            
            $this->info('Notification dispatched successfully!');
            
        } catch (\Throwable $e) {
            $this->error('Failed to send email: ' . $e->getMessage());
            $this->error('File: ' . $e->getFile() . ':' . $e->getLine());
        }
    }
}
