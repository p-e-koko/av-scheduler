<!DOCTYPE html>
<html>
<head>
    <title>Assignment Cancelled</title>
</head>
<body>
    <h1>Hello {{ $user->name }},</h1>
    <p>The assignment <strong>{{ $assignmentName }}</strong> has been cancelled.</p>
    <p>This assignment has been removed from your schedule.</p>
    <p><strong>Details of cancelled assignment:</strong></p>
    <p>Name: {{ $assignmentName }}</p>
    @if($startDate)
    <p>Date: {{ $startDate }}</p>
    @endif
    <p>Location: {{ $location }}</p>
    <p>We apologize for any inconvenience.</p>
    <p>Thank you.</p>
</body>
</html>
