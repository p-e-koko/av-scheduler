<!DOCTYPE html>
<html>
<head>
    <title>Booking Confirmation</title>
</head>
<body>
    <h1>Hello {{ $notifiable->name }}!</h1>
    <p>Your booking has been successfully submitted.</p>
    <p><strong>Event Name:</strong> {{ $booking->event_name }}</p>
    <p><strong>Location:</strong> {{ $booking->location }}</p>
    <p><strong>Date & Time:</strong> {{ $booking->start_datetime->format('D, d M Y H:i') }} – {{ $booking->end_datetime->format('H:i') }}</p>
    <p><strong>Please wait for the confirmation.</strong> Our coordination team will review your request and confirm it shortly.</p>
    <p><a href="{{ url('/dashboard/customer?tab=my-bookings') }}">View My Bookings</a></p>
    <p>Thank you for using our media service.</p>
    <p>Regards,<br>{{ config('app.name') }}</p>
</body>
</html>
