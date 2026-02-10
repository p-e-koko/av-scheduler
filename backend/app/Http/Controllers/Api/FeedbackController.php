<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use App\Notifications\FeedbackSubmittedNotification;

class FeedbackController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'type' => 'required|in:issue,recommendation',
        ]);

        $user = $request->user(); // Get authenticated user if available

        try {
            $recruitEmail = config('services.feedback.recipient_email');
            
            if (!$recruitEmail) {
               Log::error('FEEDBACK_RECIPIENT_EMAIL is not configured.');
               return response()->json(['message' => 'Feedback configuration error.'], 500);
            }

            Notification::route('mail', $recruitEmail)
                ->notify(new FeedbackSubmittedNotification($validated, $user));

            return response()->json(['message' => 'Feedback sent successfully.']);
        } catch (\Exception $e) {
            Log::error('Failed to send feedback email: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to send feedback.'], 500);
        }
    }
}
