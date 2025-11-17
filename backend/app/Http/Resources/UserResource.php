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
