<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Mail\BookingCreatedStaff;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingCreatedStaffNotification extends Notification
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
            ->title('New Media Booking Request')
            ->icon('/icons/icon-192x192.png')
            ->body('New booking: "' . $this->booking->event_name . '" at ' . $this->booking->location)
            ->data(['url' => '/dashboard/coordinator?tab=assignments&filter=booking']);
    }

    public function toMail(object $notifiable): BookingCreatedStaff
    {
        return (new BookingCreatedStaff($this->booking, $notifiable))
                    ->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'message'    => 'New booking from ' . $this->booking->customer->name . ': "' . $this->booking->event_name . '" (awaiting approval)',
            'booking_id' => $this->booking->id,
            'type'       => 'booking_created_staff',
            'url'        => '/dashboard/coordinator?tab=assignments&filter=booking',
        ];
    }
}
