<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Sent to the customer when a coordinator approves their booking.
 * The booking moves from 'booking' to 'to_assign' (awaiting staff assignment).
 */
class BookingApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(public MediaBooking $booking) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('Booking Confirmed')
            ->icon('/icons/icon-192x192.png')
            ->body('Your booking for "' . $this->booking->event_name . '" has been confirmed and is being assigned.')
            ->data(['url' => '/dashboard/customer?tab=my-bookings']);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Media Booking Has Been Confirmed: ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Good news! Your media service booking has been **confirmed** by our coordination team and is now being assigned to staff.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i') . ' – ' . $this->booking->end_datetime->format('H:i'))
            ->action('View My Bookings', url('/dashboard/customer?tab=my-bookings'))
            ->line('Thank you for using our media service.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message'    => 'Your booking for "' . $this->booking->event_name . '" has been confirmed and is being assigned.',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_approved',
            'url'        => '/dashboard/customer?tab=my-bookings',
        ];
    }
}
