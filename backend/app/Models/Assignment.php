<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assignment extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'assignment_name',
        'event_name',
        'event_location',
        'event_start_datetime',
        'event_end_datetime',
        'description',
        'status',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'event_start_datetime' => 'datetime',
        'event_end_datetime' => 'datetime',
    ];

    /**
     * Get the users assigned to this assignment.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'assignment_users', 'assignment_id', 'user_id')
                    ->using(AssignmentUser::class)
                    ->withPivot('status', 'checked_in', 'position', 'rejection_reason', 'google_event_id', 'microsoft_event_id', 'is_modified')
                    ->withTimestamps();
    }

    /**
     * Get the user who created this assignment.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to filter assignments by status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter assignments that are pending.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to filter assignments that are confirmed.
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Scope to filter assignments that are complete.
     */
    public function scopeComplete($query)
    {
        return $query->where('status', 'complete');
    }

    /**
     * Scope to filter assignments by date range.
     */
    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('event_start_datetime', [$startDate, $endDate]);
    }

    /**
     * Scope to filter upcoming assignments.
     */
    public function scopeUpcoming($query)
    {
        return $query->where('event_start_datetime', '>', now());
    }

    /**
     * Scope to filter past assignments.
     */
    public function scopePast($query)
    {
        return $query->where('event_end_datetime', '<', now());
    }

    /**
     * Check if the assignment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the assignment is confirmed.
     */
    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    /**
     * Check if the assignment is complete.
     */
    public function isComplete(): bool
    {
        return $this->status === 'complete';
    }

    /**
     * Check if the assignment is upcoming.
     */
    public function isUpcoming(): bool
    {
        return $this->event_start_datetime > now();
    }

    /**
     * Check if the assignment is currently ongoing.
     */
    public function isOngoing(): bool
    {
        return $this->event_start_datetime <= now() && $this->event_end_datetime >= now();
    }

    /**
     * Check if the assignment is past.
     */
    public function isPast(): bool
    {
        return $this->event_end_datetime < now();
    }

    /**
     * Get the duration of the assignment in hours.
     */
    public function getDurationInHours(): float
    {
        return $this->event_start_datetime->diffInMinutes($this->event_end_datetime) / 60;
    }

    /**
     * Get the number of assigned users.
     */
    public function getAssignedUsersCount(): int
    {
        return $this->users()->count();
    }

    /**
     * Get the number of checked-in users.
     */
    public function getCheckedInUsersCount(): int
    {
        return $this->users()->wherePivot('checked_in', true)->count();
    }

    /**
     * Assign a user to this assignment with optional position.
     */
    public function assignUser(User $user, string $status = 'assigned', ?string $position = null): void
    {
        $this->users()->attach($user->id, [
            'status' => $status,
            'checked_in' => false,
            'position' => $position,
        ]);
    }

    /**
     * Remove a user from this assignment.
     */
    public function unassignUser(User $user): void
    {
        $this->users()->detach($user->id);
    }

    /**
     * Update the user's assignment status.
     */
    public function updateUserStatus(User $user, string $status, ?string $rejection_reason = null): void
    {
        $data = ['status' => $status];
        if ($rejection_reason !== null) {
            $data['rejection_reason'] = $rejection_reason;
        }
        $this->users()->updateExistingPivot($user->id, $data);
    }

    /**
     * Update the user's position in this assignment.
     */
    public function updateUserPosition(User $user, string $position): void
    {
        $this->users()->updateExistingPivot($user->id, ['position' => $position]);
    }

    /**
     * Check in a user for this assignment.
     */
    public function checkInUser(User $user): void
    {
        $this->users()->updateExistingPivot($user->id, ['checked_in' => true]);
    }

    /**
     * Check out a user from this assignment.
     */
    public function checkOutUser(User $user): void
    {
        $this->users()->updateExistingPivot($user->id, ['checked_in' => false]);
    }

    /**
     * Get the formatted duration of the assignment.
     */
    public function getFormattedDuration(): string
    {
        return $this->event_start_datetime->diffForHumans($this->event_end_datetime, true);
    }

    /**
     * Get the time until the assignment starts.
     */
    public function getTimeUntilStart(): string
    {
        return $this->event_start_datetime->diffForHumans();
    }

    /**
     * Get the time since the assignment ended.
     */
    public function getTimeSinceEnd(): string
    {
        return $this->event_end_datetime->diffForHumans();
    }

    /**
     * Get the completion percentage based on time.
     */
    public function getCompletionPercentage(): float
    {
        if ($this->isUpcoming()) {
            return 0;
        }
        if ($this->isPast()) {
            return 100;
        }

        $totalDuration = $this->event_start_datetime->diffInMinutes($this->event_end_datetime);
        $elapsedDuration = $this->event_start_datetime->diffInMinutes(now());

        if ($totalDuration == 0) {
            return 100;
        }

        return round(($elapsedDuration / $totalDuration) * 100, 2);
    }
}
