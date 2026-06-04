<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Query notifications explicitly using the polymorphic columns
        $notifications = DatabaseNotification::where('notifiable_id', $user->getKey())
            ->where('notifiable_type', get_class($user))
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json($notifications);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = DatabaseNotification::where('id', $id)
            ->where('notifiable_id', $user->getKey())
            ->where('notifiable_type', get_class($user))
            ->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read']);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        DatabaseNotification::where('notifiable_id', $user->getKey())
            ->where('notifiable_type', get_class($user))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    /**
     * Store or update a push subscription.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $endpoint = $request->input('endpoint');
        $key = $request->input('keys.p256dh');
        $token = $request->input('keys.auth');
        $contentEncoding = $request->input('contentEncoding', 'aesgcm');

        $request->user()->updatePushSubscription($endpoint, $key, $token, $contentEncoding);

        return response()->json(['message' => 'Push subscription saved successfully']);
    }

    /**
     * Delete a push subscription.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $endpoint = $request->input('endpoint');
        $request->user()->deletePushSubscription($endpoint);

        return response()->json(['message' => 'Push subscription deleted successfully']);
    }

    /**
     * Get the VAPID public key.
     */
    public function vapidKey(): JsonResponse
    {
        $publicKey = config('webpush.vapid.public_key');
        return response()->json(['vapid_public_key' => $publicKey]);
    }
}
