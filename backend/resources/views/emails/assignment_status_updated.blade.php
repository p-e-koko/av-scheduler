<!DOCTYPE html>
<html>
<head>
    <title>Assignment Status Update</title>
</head>
<body>
    <h1>Assignment Status Update</h1>
    <p>Student <strong>{{ $user->name }}</strong> has <strong>{{ $status }}</strong> the assignment <strong>{{ $assignment->assignment_name }}</strong>.</p>

    @if($status === 'rejected' && $reason)
        <p><strong>Reason for rejection:</strong></p>
        <p>{{ $reason }}</p>
    @endif

    <p>Please check the dashboard for more details.</p>
</body>
</html>
