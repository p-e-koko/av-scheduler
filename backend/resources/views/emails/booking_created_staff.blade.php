<!DOCTYPE html>
<html>
<head>
    <title>New Media Booking</title>
</head>
<body>
    <h1>Hello {{ $notifiable->name }},</h1>
    <p>A new media service booking has been submitted and is awaiting your approval.</p>
    <p><strong>Event Name:</strong> {{ $booking->event_name }}</p>
    <p><strong>Location:</strong> {{ $booking->location }}</p>
    <p><strong>Date & Time:</strong> {{ $booking->start_datetime->format('D, d M Y H:i') }} – {{ $booking->end_datetime->format('H:i') }}</p>
    <p><strong>Requested By:</strong> {{ $booking->customer->name }} ({{ $booking->customer->email }})</p>
    <p><strong>Equipment Request:</strong> {{ $booking->equipment_request ?? 'None' }}</p>
    <p>Please log in to your dashboard to review this booking: <a href="{{ url('/dashboard/coordinator?tab=assignments&filter=booking') }}">Review Booking</a></p>
</body>
</html>
