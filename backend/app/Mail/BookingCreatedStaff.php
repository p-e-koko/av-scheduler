<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingCreatedStaff extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $booking;
    public $notifiable;

    /**
     * Create a new message instance.
     */
    public function __construct($booking, $notifiable)
    {
        // Load the customer if not loaded
        $this->booking = $booking->loadMissing('customer');
        $this->notifiable = $notifiable;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Media Booking: ' . $this->booking->event_name,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.booking_created_staff',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
