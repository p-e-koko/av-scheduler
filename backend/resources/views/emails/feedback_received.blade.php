<!DOCTYPE html>
<html>
<head>
    <title>New Feedback Received</title>
</head>
<body>
    <h1>New Feedback Received</h1>

    <p><strong>Type:</strong> {{ ucfirst($data['type'] ?? 'General') }}</p>

    @if($user)
        <p><strong>From:</strong> {{ $user->name }} ({{ $user->email }})</p>
    @else
        <p><strong>From:</strong> Anonymous</p>
    @endif

    <p><strong>Message:</strong></p>
    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
        {!! nl2br(e($data['message'])) !!}
    </div>

    <p>Has been Submitted on {{ now()->toDateTimeString() }}</p>
</body>
</html>
