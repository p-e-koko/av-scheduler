<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityResource extends JsonResource
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
            'student_id' => $this->student_id,
            'title' => $this->title,
            'recurrence_id' => $this->recurrence_id,
            'date' => $this->date,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Include user relationship when loaded
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'student_id' => $this->user->student_id,
                    'email' => $this->user->email,
                    'role' => $this->user->role,
                    'profile_picture_url' => $this->user->getProfilePictureUrlAttribute(),
                ];
            }),

            // Computed fields for frontend convenience
            'duration_minutes' => $this->getDurationInMinutes(),
            'formatted_time' => $this->getFormattedTimeRange(),
            'is_past' => $this->isPast(),
            'is_today' => $this->isToday(),
        ];
    }

    /**
     * Get duration in minutes.
     */
    private function getDurationInMinutes(): int
    {
        $start = \Carbon\Carbon::createFromFormat('H:i:s', $this->start_time);
        $end = \Carbon\Carbon::createFromFormat('H:i:s', $this->end_time);

        return abs($end->diffInMinutes($start));
    }

    /**
     * Get formatted time range.
     */
    private function getFormattedTimeRange(): string
    {
        $start = \Carbon\Carbon::createFromFormat('H:i:s', $this->start_time)->format('g:i A');
        $end = \Carbon\Carbon::createFromFormat('H:i:s', $this->end_time)->format('g:i A');

        return "{$start} - {$end}";
    }

    /**
     * Check if the availability date is in the past.
     */
    private function isPast(): bool
    {
        return \Carbon\Carbon::parse($this->date)->isPast();
    }

    /**
     * Check if the availability date is today.
     */
    private function isToday(): bool
    {
        return \Carbon\Carbon::parse($this->date)->isToday();
    }
}
