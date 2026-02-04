<?php

namespace App\Notifications;

use App\Models\Assignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AssignmentDeletedNotification extends Notification
{
    use Queueable;

    public $assignmentName;
    public $startDate;
    public $location;

    /**
     * Create a new notification instance.
     */
    public function __construct(Assignment $assignment)
    {
        // Extract data immediately to prevent serialization issues with deleted models
        $this->assignmentName = $assignment->assignment_name;
        $this->startDate = $assignment->event_start_datetime ? \Carbon\Carbon::parse($assignment->event_start_datetime)->format('F j, Y g:i A') : null;
        $this->location = $assignment->event_location ?? 'N/A';
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \App\Mail\AssignmentDeleted
    {
        return (new \App\Mail\AssignmentDeleted($this->assignmentName, $this->startDate, $this->location, $notifiable))
                    ->to($notifiable->email);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'Assignment has been cancelled: ' . $this->assignmentName,
            'assignment_name' => $this->assignmentName,
            'type' => 'assignment_deleted',
            'url' => '/dashboard/student?tab=assignments', // They can go check their list to see it's gone
        ];
    }
}
