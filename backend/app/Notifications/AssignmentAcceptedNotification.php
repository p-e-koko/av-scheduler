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
        return ['database', 'mail', WebPushChannel::class];
    }

    private function getTargetUrl(object $notifiable): string
    {
        $userRoles = method_exists($notifiable, 'getRoleNames') ? $notifiable->getRoleNames()->toArray() : [];
        if ($notifiable->role) {
            $userRoles[] = $notifiable->role;
        }

        if (in_array('marketing_supervisor', $userRoles, true)) {
            return '/dashboard/marketing-supervisor?tab=assignments';
        }
        if (in_array('marketing_coordinator', $userRoles, true)) {
            return '/dashboard/marketing-coordinator?tab=assignments';
        }
        if (in_array('supervisor', $userRoles, true)) {
            return '/dashboard/supervisor?tab=assignments';
        }

        return '/dashboard/coordinator?tab=assignments';
    }

    /**
     * Get the WebPush representation of the notification.
     */
    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('Assignment Accepted')
            ->icon('/icons/icon-192x192.png')
            ->body($this->student->name . ' has accepted the assignment: ' . $this->assignment->assignment_name)
            ->data(['url' => $this->getTargetUrl($notifiable)]);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \App\Mail\AssignmentStatusUpdated
    {
        return (new \App\Mail\AssignmentStatusUpdated($this->assignment, $this->student, 'accepted'))
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
            'message' => $this->student->name . ' has accepted the assignment: ' . $this->assignment->assignment_name,
            'assignment_id' => $this->assignment->id,
            'student_id' => $this->student->id,
            'type' => 'assignment_accepted',
            'url' => $this->getTargetUrl($notifiable),
        ];
    }
}
