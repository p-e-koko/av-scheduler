<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Mail\FeedbackReceived; // Import the existing mailable

class FeedbackSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $data;
    public $user;

    /**
     * Create a new notification instance.
     */
    public function __construct($data, $user = null)
    {
        $this->data = $data;
        $this->user = $user;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): FeedbackReceived
    {
        return (new FeedbackReceived($this->data, $this->user))
                    ->to($notifiable->routes['mail'] ?? $notifiable->email);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
