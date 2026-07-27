<?php

namespace App\Notifications;

use App\Models\BookingComment;
use App\Models\MediaBooking;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class BookingCommentNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MediaBooking $booking,
        public BookingComment $comment,
        public User $author,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail', WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        $title = $this->author->hasRole('customer')
            ? 'New Reply on Booking'
            : 'New Comment on Your Booking';

        return (new WebPushMessage)
            ->title($title)
            ->icon('/icons/icon-192x192.png')
            ->body('"' . $this->comment->content . '"')
            ->data(['url' => $this->getRedirectUrl()]);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isFromCustomer = $this->author->hasRole('customer');
        $subject = $isFromCustomer
            ? 'Customer Replied to Your Comment'
            : 'New Comment on Your Booking';

        $greeting = 'Hello ' . $notifiable->name . ',';

        $body = $isFromCustomer
            ? $this->author->name . ' has replied to a conversation regarding booking "' . $this->booking->event_name . '".'
            : 'A coordinator has left a new comment on your booking "' . $this->booking->event_name . '".';

        return (new MailMessage)
            ->subject($subject)
            ->greeting($greeting)
            ->line($body)
            ->line('**Message:**')
            ->line($this->comment->content)
            ->line('Please log in to read and reply.')
            ->action('View Booking', url($this->getRedirectUrl()));
    }

    public function toArray(object $notifiable): array
    {
        $isFromCustomer = $this->author->hasRole('customer');

        return [
            'message'    => $isFromCustomer
                ? $this->author->name . ' replied to booking "' . $this->booking->event_name . '"'
                : 'New comment on booking "' . $this->booking->event_name . '"',
            'booking_id' => $this->booking->id,
            'comment_id' => $this->comment->id,
            'type'       => $isFromCustomer ? 'booking_comment_reply' : 'booking_comment',
            'url'        => $this->getRedirectUrl(),
        ];
    }

    private function getRedirectUrl(): string
    {
        if ($this->author->hasRole('customer')) {
            return '/dashboard/coordinator?tab=assignments&filter=booking';
        }
        return '/dashboard/customer?tab=my-bookings';
    }
}
