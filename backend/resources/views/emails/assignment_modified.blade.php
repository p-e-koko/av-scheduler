<!DOCTYPE html>
<html>
<head>
    <title>Assignment Modified</title>
</head>
<body>
    <h1>Hello {{ $user->name }},</h1>
    <p>The assignment <strong>{{ $assignment->assignment_name }}</strong> has been modified.</p>
    <p>Please log in to your dashboard to review the changes: <a href="https://www.av.apiu.edu">https://www.av.apiu.edu</a></p>
    <p>Description: {{ $assignment->description }}</p>
    @if($assignment->event_start_datetime)
    <p>Start Time: {{ \Carbon\Carbon::parse($assignment->event_start_datetime)->format('F j, Y g:i A') }}</p>
    @endif
    @if($assignment->event_end_datetime)
    <p>End Time: {{ \Carbon\Carbon::parse($assignment->event_end_datetime)->format('F j, Y g:i A') }}</p>
    @endif
    <p>Location: {{ $assignment->event_location }}</p>
    <p>Thank you.</p>
</body>
</html>
