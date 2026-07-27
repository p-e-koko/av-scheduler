<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
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

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your Media Service Booking Has Been Received')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Your booking has been successfully submitted.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i') . ' – ' . $this->booking->end_datetime->format('H:i'))
            ->line('**Please wait for the confirmation.** Our coordination team will review your request and confirm it shortly.')
            ->action('View My Bookings', url('/dashboard/customer?tab=my-bookings'))
            ->line('Thank you for using our media service.');
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
