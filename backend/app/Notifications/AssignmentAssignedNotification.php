<?php

namespace App\Notifications;

use App\Models\Assignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class AssignmentAssignedNotification extends Notification
{
    use Queueable;

    public $assignment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Assignment $assignment)
    {
        $this->assignment = $assignment;
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

    private function getTargetUrl(object $notifiable): string
    {
        $userRoles = method_exists($notifiable, 'getRoleNames') ? $notifiable->getRoleNames()->toArray() : [];
        if ($notifiable->role) {
            $userRoles[] = $notifiable->role;
        }

        if (in_array('student_ambassador', $userRoles, true) || $this->assignment->department === 'marketing') {
            return '/dashboard/student-ambassador?tab=assignments';
        }

        return '/dashboard/student?tab=assignments';
    }

    /**
     * Get the WebPush representation of the notification.
     */
    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('New Assignment Assigned')
            ->icon('/icons/icon-192x192.png')
            ->body('You have been assigned to a new assignment: ' . $this->assignment->assignment_name)
            ->data(['url' => $this->getTargetUrl($notifiable)]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \App\Mail\AssignmentAssigned
    {
        return (new \App\Mail\AssignmentAssigned($this->assignment, $notifiable))
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
            'message' => 'You have been assigned to a new assignment: ' . $this->assignment->assignment_name,
            'assignment_id' => $this->assignment->id,
            'type' => 'assignment_assigned',
            'url' => $this->getTargetUrl($notifiable),
        ];
    }
}
