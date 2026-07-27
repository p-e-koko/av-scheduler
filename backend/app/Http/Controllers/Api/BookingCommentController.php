<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BookingComment;
use App\Models\MediaBooking;
use App\Models\User;
use App\Notifications\BookingCommentNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingCommentController extends Controller
{
    public function index(MediaBooking $mediaBooking): JsonResponse
    {
        $comments = $mediaBooking->comments()->with('user')->orderBy('created_at', 'asc')->get();

        return response()->json([
            'comments' => $comments->map(function ($comment) {
                return [
                    'id'         => $comment->id,
                    'content'    => $comment->content,
                    'user_id'    => $comment->user_id,
                    'user'       => [
                        'id'   => $comment->user->id,
                        'name' => $comment->user->name,
                        'role' => $comment->user->role,
                    ],
                    'created_at' => $comment->created_at->toISOString(),
                ];
            }),
        ]);
    }

    public function store(Request $request, MediaBooking $mediaBooking): JsonResponse
    {
        $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        /** @var User $user */
        $user = $request->user();

        $comment = DB::transaction(function () use ($request, $mediaBooking, $user) {
            return $mediaBooking->comments()->create([
                'user_id' => $user->id,
                'content' => $request->content,
            ]);
        });

        $comment->load('user');

        // Notify the relevant party
        try {
            if ($user->hasRole('customer')) {
                $staff = User::role(['coordinator', 'supervisor'])->get();
                foreach ($staff as $staffUser) {
                    $staffUser->notify(new BookingCommentNotification($mediaBooking, $comment, $user));
                }
            } else {
                $customer = $mediaBooking->customer;
                if ($customer) {
                    $customer->notify(new BookingCommentNotification($mediaBooking, $comment, $user));
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Booking comment notification failed', [
                'booking_id' => $mediaBooking->id,
                'comment_id' => $comment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Comment added successfully.',
            'comment' => [
                'id'         => $comment->id,
                'content'    => $comment->content,
                'user_id'    => $comment->user_id,
                'user'       => [
                    'id'   => $comment->user->id,
                    'name' => $comment->user->name,
                    'role' => $comment->user->role,
                ],
                'created_at' => $comment->created_at->toISOString(),
            ],
        ], 201);
    }

    public function done(MediaBooking $mediaBooking): JsonResponse
    {
        $mediaBooking->comments()->forceDelete();

        return response()->json([
            'message' => 'All comments have been permanently deleted.',
        ]);
    }
}
