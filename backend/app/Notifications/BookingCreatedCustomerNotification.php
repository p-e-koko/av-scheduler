<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Mail\BookingCreatedCustomer;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingCreatedCustomerNotification extends Notification
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
            ->title('Booking Received')
            ->icon('/icons/icon-192x192.png')
            ->body('Your booking for "' . $this->booking->event_name . '" has been received. Please wait for confirmation.')
            ->data(['url' => '/dashboard/customer?tab=my-bookings']);
    }

    public function toMail(object $notifiable): BookingCreatedCustomer
    {
        return (new BookingCreatedCustomer($this->booking, $notifiable))
                    ->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message'    => 'Your booking for "' . $this->booking->event_name . '" has been submitted. Please wait for confirmation.',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_created',
            'url'        => '/dashboard/customer?tab=my-bookings',
        ];
    }
}
