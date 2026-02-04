<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AssignmentDeleted extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $assignmentName;
    public $startDate;
    public $location;
    public $user;

    /**
     * Create a new message instance.
     */
    public function __construct($assignmentName, $startDate, $location, $user)
    {
        $this->assignmentName = $assignmentName;
        $this->startDate = $startDate;
        $this->location = $location;
        $this->user = $user;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Assignment Cancelled: ' . $this->assignmentName,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.assignment_deleted',
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
