<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment_name' => $this->assignment_name,
            'event_name' => $this->event_name,
            'event_location' => $this->event_location,
            'event_start_datetime' => $this->event_start_datetime?->toISOString(),
            'event_end_datetime' => $this->event_end_datetime?->toISOString(),
            'description' => $this->description,
            'status' => $this->status,
            'created_by' => $this->created_by,

            // Computed fields for assignment status
            'is_pending' => $this->isPending(),
            'is_confirmed' => $this->isConfirmed(),
            'is_complete' => $this->isComplete(),
            'is_upcoming' => $this->isUpcoming(),
            'is_ongoing' => $this->isOngoing(),
            'is_past' => $this->isPast(),

            // Duration and timing information
            'duration_in_hours' => $this->getDurationInHours(),
            'formatted_duration' => $this->getFormattedDuration(),
            'time_until_start' => $this->getTimeUntilStart(),
            'time_since_end' => $this->getTimeSinceEnd(),

            // Assignment statistics
            'assigned_users_count' => $this->getAssignedUsersCount(),
            'checked_in_users_count' => $this->getCheckedInUsersCount(),
            'completion_percentage' => $this->getCompletionPercentage(),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),

            // Include relationships when loaded
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'email' => $this->creator->email,
                    'role' => $this->creator->role,
                ];
            }),

            'users' => $this->whenLoaded('users', function () {
                return $this->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'student_id' => $user->student_id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'profile_picture_url' => $user->getProfilePictureUrlAttribute(),

                        // Pivot data from assignment_users table
                        'pivot' => [
                            'status' => $user->pivot->status,
                            'checked_in' => $user->pivot->checked_in,
                            'position' => $user->pivot->position,
                            'google_event_id' => $user->pivot->google_event_id,
                            'created_at' => $user->pivot->created_at?->toISOString(),
                            'updated_at' => $user->pivot->updated_at?->toISOString(),
                        ]
                    ];
                });
            }),

            // User-specific data if authenticated user is assigned
            'current_user_assignment' => $this->getCurrentUserAssignment($request),

            // Pivot data if available (e.g. when fetching my assignments)
            'pivot' => $this->when($this->pivot, function () {
                return [
                    'status' => $this->pivot->status,
                    'checked_in' => $this->pivot->checked_in,
                    'position' => $this->pivot->position,
                    'rejection_reason' => $this->pivot->rejection_reason ?? null,
                    'google_event_id' => $this->pivot->google_event_id,
                ];
            }),
        ];
    }

    /**
     * Get formatted duration string.
     */
    private function getFormattedDuration(): string
    {
        $hours = $this->getDurationInHours();

        if ($hours < 1) {
            $minutes = round($hours * 60);
            return "{$minutes} minutes";
        } elseif ($hours == 1) {
            return "1 hour";
        } else {
            $wholeHours = floor($hours);
            $minutes = round(($hours - $wholeHours) * 60);

            if ($minutes > 0) {
                return "{$wholeHours} hours {$minutes} minutes";
            } else {
                return "{$wholeHours} hours";
            }
        }
    }

    /**
     * Get time until assignment starts.
     */
    private function getTimeUntilStart(): ?string
    {
        if (!$this->isUpcoming()) {
            return null;
        }

        return $this->event_start_datetime->diffForHumans();
    }

    /**
     * Get time since assignment ended.
     */
    private function getTimeSinceEnd(): ?string
    {
        if (!$this->isPast()) {
            return null;
        }

        return $this->event_end_datetime->diffForHumans();
    }

    /**
     * Get completion percentage based on checked-in users.
     */
    private function getCompletionPercentage(): float
    {
        $totalUsers = $this->getAssignedUsersCount();

        if ($totalUsers === 0) {
            return 0;
        }

        $checkedInUsers = $this->getCheckedInUsersCount();

        return round(($checkedInUsers / $totalUsers) * 100, 2);
    }

    /**
     * Get current authenticated user's assignment data if they are assigned.
     */
    private function getCurrentUserAssignment($request): ?array
    {
        $user = $request->user();

        if (!$user || !$this->relationLoaded('users')) {
            return null;
        }

        $assignedUser = $this->users->where('id', $user->id)->first();

        if (!$assignedUser) {
            return null;
        }

        return [
            'status' => $assignedUser->pivot->status,
            'checked_in' => $assignedUser->pivot->checked_in,
            'position' => $assignedUser->pivot->position,
            'assigned_at' => $assignedUser->pivot->created_at?->toISOString(),
            'can_check_in' => $this->isOngoing() && !$assignedUser->pivot->checked_in,
            'can_check_out' => $this->isOngoing() && $assignedUser->pivot->checked_in,
        ];
    }
}
