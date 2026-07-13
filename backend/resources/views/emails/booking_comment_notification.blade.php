<!DOCTYPE html>
<html>
<head>
    <title>New Message on Booking</title>
</head>
<body>
    <h1>{{ $subject ?? 'New Message on Booking' }}</h1>

    <p><strong>Booking:</strong> {{ $booking->event_name }}</p>
    <p><strong>From:</strong> {{ $author->name }} ({{ $author->email }})</p>

    <p><strong>Message:</strong></p>
    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
        {!! nl2br(e($comment->content)) !!}
    </div>

    <p>Please <a href="{{ $url ?? '#' }}">log in</a> to read and reply.</p>
</body>
</html>
