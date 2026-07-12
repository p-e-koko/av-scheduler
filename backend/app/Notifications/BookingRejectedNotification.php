<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Sent to the customer when a coordinator rejects their booking.
 * The booking moves to 'canceled' with the provided reason.
 */
class BookingRejectedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MediaBooking $booking,
        public ?string $reason = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('Booking Declined')
            ->icon('/icons/icon-192x192.png')
            ->body('Your booking for "' . $this->booking->event_name . '" has been declined.')
            ->data(['url' => '/dashboard/customer?tab=my-bookings']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Update on Your Media Booking: ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('We\'re sorry to inform you that your media service booking has been **declined**.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i'));

        if ($this->reason) {
            $mail->line('**Reason:** ' . $this->reason);
        }

        return $mail->line('If you have any questions, please contact the coordination team.')
            ->action('View My Bookings', url('/dashboard/customer?tab=my-bookings'));
    }

    public function toArray(object $notifiable): array
    {
        $message = 'Your booking for "' . $this->booking->event_name . '" has been declined.';
        if ($this->reason) {
            $message .= ' Reason: ' . $this->reason;
        }

        return [
            'message'    => $message,
            'booking_id' => $this->booking->id,
            'type'       => 'booking_rejected',
            'url'        => '/dashboard/customer?tab=my-bookings',
        ];
    }
}
