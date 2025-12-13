<!DOCTYPE html>
<html>
<head>
    <title>New Assignment</title>
</head>
<body>
    <h1>Hello {{ $user->name }},</h1>
    <p>You have been assigned a new task: <strong>{{ $assignment->assignment_name }}</strong>.</p>
    <p>Description: {{ $assignment->description }}</p>
    <p>Please log in to your dashboard to accept or reject this assignment.</p>
    <p>Thank you.</p>
</body>
</html>
