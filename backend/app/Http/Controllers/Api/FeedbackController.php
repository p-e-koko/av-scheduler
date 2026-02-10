<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\FeedbackReceived;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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
            $recruitEmail = env('FEEDBACK_RECIPIENT_EMAIL');
            
            if (!$recruitEmail) {
               Log::error('FEEDBACK_RECIPIENT_EMAIL is not configured.');
               return response()->json(['message' => 'Feedback configuration error.'], 500);
            }

            Mail::to($recruitEmail)->send(new FeedbackReceived($validated, $user));

            return response()->json(['message' => 'Feedback sent successfully.']);
        } catch (\Exception $e) {
            Log::error('Failed to send feedback email: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to send feedback.'], 500);
        }
    }
}
