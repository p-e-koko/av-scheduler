<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class AssignmentCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @return array<int|string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => AssignmentResource::collection($this->collection),
            'meta' => [
                'total' => $this->resource->total(),
                'per_page' => $this->resource->perPage(),
                'current_page' => $this->resource->currentPage(),
                'last_page' => $this->resource->lastPage(),
                'from' => $this->resource->firstItem(),
                'to' => $this->resource->lastItem(),
                'path' => $this->resource->path(),

                // Assignment-specific statistics
                'statistics' => $this->getStatistics(),
            ],
            'links' => [
                'first' => $this->resource->url(1),
                'last' => $this->resource->url($this->resource->lastPage()),
                'prev' => $this->resource->previousPageUrl(),
                'next' => $this->resource->nextPageUrl(),
                'self' => $this->resource->url($this->resource->currentPage()),
            ],
        ];
    }

    /**
     * Get collection statistics.
     */
    private function getStatistics(): array
    {
        $assignments = $this->collection;

        return [
            'total_assignments' => $assignments->count(),
            'pending_assignments' => $assignments->where('status', 'pending')->count(),
            'confirmed_assignments' => $assignments->where('status', 'confirmed')->count(),
            'complete_assignments' => $assignments->where('status', 'complete')->count(),
            'upcoming_assignments' => $assignments->filter(function ($assignment) {
                return $assignment->isUpcoming();
            })->count(),
            'ongoing_assignments' => $assignments->filter(function ($assignment) {
                return $assignment->isOngoing();
            })->count(),
            'past_assignments' => $assignments->filter(function ($assignment) {
                return $assignment->isPast();
            })->count(),
            'total_assigned_users' => $assignments->sum(function ($assignment) {
                return $assignment->getAssignedUsersCount();
            }),
            'average_duration_hours' => $assignments->isNotEmpty() ?
                round($assignments->avg(function ($assignment) {
                    return $assignment->getDurationInHours();
                }), 2) : 0,
        ];
    }

    /**
     * Add additional data to the response.
     */
    public function with($request): array
    {
        return [
            'message' => 'Assignments retrieved successfully',
            'timestamp' => now()->toISOString(),
        ];
    }
}
