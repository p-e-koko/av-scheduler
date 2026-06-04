<?php

namespace App\Notifications;

use App\Models\Assignment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class AssignmentRejectedNotification extends Notification
{
    use Queueable;

    public $assignment;
    public $student;
    public $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(Assignment $assignment, User $student, $reason = null)
    {
        $this->assignment = $assignment;
        $this->student = $student;
        $this->reason = $reason;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    /**
     * Get the WebPush representation of the notification.
     */
    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        $body = $this->student->name . ' has rejected the assignment: ' . $this->assignment->assignment_name;
        if ($this->reason) {
            $body .= ' (Reason: ' . $this->reason . ')';
        }
        return (new WebPushMessage)
            ->title('Assignment Rejected')
            ->icon('/icons/icon-192x192.png')
            ->body($body)
            ->data(['url' => '/dashboard/coordinator?tab=assignments']);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \App\Mail\AssignmentStatusUpdated
    {
        return (new \App\Mail\AssignmentStatusUpdated($this->assignment, $this->student, 'rejected', $this->reason))
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
            'message' => $this->student->name . ' has rejected the assignment: ' . $this->assignment->assignment_name,
            'assignment_id' => $this->assignment->id,
            'student_id' => $this->student->id,
            'type' => 'assignment_rejected',
            'url' => '/dashboard/coordinator?tab=assignments',
        ];
    }
}
