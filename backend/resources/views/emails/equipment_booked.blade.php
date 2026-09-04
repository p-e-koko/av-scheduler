<!DOCTYPE html>
<html>
<head>
    <title>Marketing Equipment Booked</title>
</head>
<body>
    <h1>Hello {{ $user->name }},</h1>
    <p>Marketing equipment has been booked.</p>
    <p><strong>Equipment:</strong> {{ $booking->equipment->name ?? 'N/A' }}</p>
    <p><strong>Booked By:</strong> {{ $booking->user->name ?? 'N/A' }} ({{ $booking->user->email ?? '' }})</p>
    <p><strong>Start Time:</strong> {{ $booking->start_time }}</p>
    <p><strong>End Time:</strong> {{ $booking->end_time }}</p>
    <p>Please log in to your marketing dashboard to review equipment reservations: <a href="https://av.apiu.edu">Click here to log in</a></p>
    <p>Thank you.</p>
</body>
</html>
