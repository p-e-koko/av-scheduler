<?php

namespace App\Notifications;

use App\Models\Assignment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AssignmentAcceptedNotification extends Notification
{
    use Queueable;

    public $assignment;
    public $student;

    /**
     * Create a new notification instance.
     */
    public function __construct(Assignment $assignment, User $student)
    {
        $this->assignment = $assignment;
        $this->student = $student;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => $this->student->name . ' has accepted the assignment: ' . $this->assignment->assignment_name,
            'assignment_id' => $this->assignment->id,
            'student_id' => $this->student->id,
            'type' => 'assignment_accepted',
            'url' => '/dashboard/coordinator?tab=assignments',
        ];
    }
}
