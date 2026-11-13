<?php

namespace App\Channels;

use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class SafeMailChannel extends MailChannel
{
    /**
     * Send the given notification safely.
     *
     * If sending email fails (e.g. mail server or Microsoft Exchange is down),
     * catch the exception so that in-app database notifications and the parent
     * application workflow continue to operate without crashing.
     *
     * @param  mixed  $notifiable
     * @param  \Illuminate\Notifications\Notification  $notification
     * @return mixed
     */
    public function send($notifiable, Notification $notification)
    {
        try {
            return parent::send($notifiable, $notification);
        } catch (Throwable $e) {
            $recipient = null;
            if (is_object($notifiable)) {
                if (method_exists($notifiable, 'routeNotificationFor')) {
                    $recipient = $notifiable->routeNotificationFor('mail', $notification);
                }
                $recipient = $recipient ?: ($notifiable->email ?? null);
            }

            Log::warning('Email notification delivery failed; continuing with in-app notification: ' . $e->getMessage(), [
                'recipient' => $recipient ?? 'unknown',
                'notification' => get_class($notification),
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
