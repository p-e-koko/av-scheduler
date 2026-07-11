<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingUpdatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MediaBooking $booking,
        public string $changeType, // 'edited' | 'canceled'
        public ?string $reason = null,
        public bool $isForCustomer = false
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        $action = $this->changeType === 'canceled' ? 'Canceled' : 'Updated';
        return (new WebPushMessage)
            ->title('Booking ' . $action)
            ->icon('/icons/icon-192x192.png')
            ->body('Booking "' . $this->booking->event_name . '" has been ' . strtolower($action) . '.')
            ->data(['url' => $this->isForCustomer
                ? '/dashboard/customer?tab=my-bookings'
                : '/dashboard/coordinator?tab=assignments']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $action = $this->changeType === 'canceled' ? 'Canceled' : 'Updated';
        $customer = $this->booking->customer;

        $mail = (new MailMessage)
            ->subject('Media Booking ' . $action . ': ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('The following media service booking has been **' . strtolower($action) . '**.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i'));

        if (!$this->isForCustomer) {
            $mail->line('**Customer:** ' . $customer->name . ' (' . $customer->email . ')');
        }

        if ($this->reason) {
            $mail->line('**Reason:** ' . $this->reason);
        }

        return $mail->action('View Details', url($this->isForCustomer
            ? '/dashboard/customer?tab=my-bookings'
            : '/dashboard/coordinator?tab=assignments'));
    }

    public function toArray(object $notifiable): array
    {
        $action = $this->changeType === 'canceled' ? 'canceled' : 'updated';
        return [
            'message'    => 'Booking "' . $this->booking->event_name . '" has been ' . $action . '.',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_' . $action,
            'url'        => $this->isForCustomer
                ? '/dashboard/customer?tab=my-bookings'
                : '/dashboard/coordinator?tab=assignments',
        ];
    }
}
