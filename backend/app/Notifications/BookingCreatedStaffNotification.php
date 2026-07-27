<?php

namespace App\Notifications;

use App\Models\MediaBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
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

    public function toMail(object $notifiable): MailMessage
    {
        $customer = $this->booking->customer;
        return (new MailMessage)
            ->subject('New Media Booking: ' . $this->booking->event_name)
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('A new media service booking has been submitted and is awaiting your approval.')
            ->line('**Event Name:** ' . $this->booking->event_name)
            ->line('**Location:** ' . $this->booking->location)
            ->line('**Date & Time:** ' . $this->booking->start_datetime->format('D, d M Y H:i') . ' – ' . $this->booking->end_datetime->format('H:i'))
            ->line('**Requested By:** ' . $customer->name . ' (' . $customer->email . ')')
            ->line('**Equipment Request:** ' . ($this->booking->equipment_request ?? 'None'))
            ->action('Review Booking', url('/dashboard/coordinator?tab=assignments&filter=booking'));
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
