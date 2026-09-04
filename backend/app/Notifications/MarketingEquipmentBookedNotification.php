<?php

namespace App\Notifications;

use App\Models\MarketingEquipmentBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class MarketingEquipmentBookedNotification extends Notification
{
    use Queueable;

    public $booking;

    /**
     * Create a new notification instance.
     */
    public function __construct(MarketingEquipmentBooking $booking)
    {
        $this->booking = $booking;
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
        $equipmentName = $this->booking->equipment->name ?? 'Equipment';
        $userName = $this->booking->user->name ?? 'A user';

        return (new WebPushMessage)
            ->title('Marketing Equipment Booked')
            ->icon('/icons/icon-192x192.png')
            ->body("{$userName} booked equipment: {$equipmentName}")
            ->data(['url' => '/dashboard/marketing-supervisor?tab=equipment']);
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): \App\Mail\EquipmentBooked
    {
        return (new \App\Mail\EquipmentBooked($this->booking, $notifiable))
                    ->to($notifiable->email);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $equipmentName = $this->booking->equipment->name ?? 'Equipment';
        $userName = $this->booking->user->name ?? 'A user';

        $userRoles = method_exists($notifiable, 'getRoleNames') ? $notifiable->getRoleNames()->toArray() : [];
        if ($notifiable->role) {
            $userRoles[] = $notifiable->role;
        }

        $url = '/dashboard/marketing-supervisor?tab=equipment';
        if (in_array('marketing_coordinator', $userRoles, true)) {
            $url = '/dashboard/marketing-coordinator?tab=equipment';
        }

        return [
            'message' => "{$userName} booked equipment: {$equipmentName} from " . date('M j, g:i A', strtotime($this->booking->start_time)) . " to " . date('M j, g:i A', strtotime($this->booking->end_time)),
            'booking_id' => $this->booking->id,
            'equipment_id' => $this->booking->equipment_id,
            'type' => 'equipment_booked',
            'url' => $url,
        ];
    }
}
