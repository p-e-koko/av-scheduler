<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'username' => $this->username,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'profile_picture' => $this->profile_picture,
            'profile_picture_url' => $this->getProfilePictureUrlAttribute(),
            'promised_hours_per_week' => $this->promised_hours_per_week,
            'remaining_hours_this_week' => $this->remaining_hours_this_week,
            'hours_worked_this_week' => $this->getHoursWorkedThisWeek(),
            'hours_completion_percentage' => $this->getHoursCompletionPercentage(),
            'has_remaining_hours' => $this->hasRemainingHours(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),

            // Include relationships when loaded
            'skills' => $this->whenLoaded('skills'),
            'assignments' => $this->whenLoaded('assignments'),
            'availability' => $this->whenLoaded('availability'),
            'notifications' => $this->whenLoaded('notifications'),

            // Include role-based permissions if using Spatie
            'permissions' => $this->whenLoaded('permissions'),
            'roles' => $this->whenLoaded('roles'),
        ];
    }
}
