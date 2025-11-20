<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'student_id',
        'username',
        'name',
        'email',
        'password',
        'role',
        'profile_picture',
        'promised_hours_per_week',
        'remaining_hours_this_week',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'promised_hours_per_week' => 'decimal:2',
            'remaining_hours_this_week' => 'decimal:2',
        ];
    }

    /**
     * Get the skills associated with the user.
     */
    public function skills()
    {
        return $this->belongsToMany(Skill::class, 'user_skills', 'user_id', 'skill_id');
    }

    /**
     * Get the assignments associated with the user.
     */
    public function assignments()
    {
        return $this->belongsToMany(Assignment::class, 'assignment_users', 'user_id', 'assignment_id')
                    ->withPivot('status', 'checked_in', 'position')
                    ->withTimestamps();
    }

    /**
     * Get the availability records for the user.
     */
    public function availability()
    {
        return $this->hasMany(Availability::class, 'student_id');
    }

    /**
     * Get the notifications for the user.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class, 'user_id', 'id');
    }

    /**
     * Check if user has a specific role.
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    /**
     * Check if user is supervisor.
     */
    public function isSupervisor(): bool
    {
        return $this->hasRole('supervisor');
    }

    /**
     * Check if user is coordinator.
     */
    public function isCoordinator(): bool
    {
        return $this->hasRole('coordinator');
    }

    /**
     * Check if user is student.
     */
    public function isStudent(): bool
    {
        return $this->hasRole('student');
    }

    /**
     * Get the hours worked this week.
     */
    public function getHoursWorkedThisWeek(): float
    {
        return $this->promised_hours_per_week - $this->remaining_hours_this_week;
    }

    /**
     * Add worked hours and update remaining hours.
     */
    public function addWorkedHours(float $hours): void
    {
        // Ensure remaining hours never goes below 0 and never exceeds promised hours
        $this->remaining_hours_this_week = max(0, min($this->promised_hours_per_week ?? 0, $this->remaining_hours_this_week - $hours));
        $this->save();
    }

    /**
     * Reset weekly hours (typically called at the start of each week).
     */
    public function resetWeeklyHours(): void
    {
        $this->remaining_hours_this_week = $this->promised_hours_per_week;
        $this->save();
    }

    /**
     * Check if user has remaining hours to work.
     */
    public function hasRemainingHours(): bool
    {
        return $this->remaining_hours_this_week > 0;
    }

    /**
     * Get the percentage of hours completed this week.
     */
    public function getHoursCompletionPercentage(): float
    {
        if ($this->promised_hours_per_week <= 0) {
            return 0;
        }

        $hoursWorked = $this->getHoursWorkedThisWeek();
        return round(($hoursWorked / $this->promised_hours_per_week) * 100, 2);
    }

    /**
     * Get the full URL for the user's profile picture.
     */
    public function getProfilePictureUrlAttribute(): ?string
    {
        if (!$this->profile_picture) {
            return null;
        }

        // If it's already a full URL, return as is
        if (str_starts_with($this->profile_picture, 'http')) {
            return $this->profile_picture;
        }

        // Generate the full URL using the app URL and storage path
        return config('app.url') . '/storage/' . $this->profile_picture;
    }

    /**
     * Get the default profile picture URL if no profile picture is set.
     */
    public function getProfilePictureOrDefaultAttribute(): string
    {
        if ($this->profile_picture) {
            return $this->getProfilePictureUrlAttribute();
        }

        // Return a default avatar/placeholder image
        return asset('images/default-avatar.png');
    }

    /**
     * Delete the user's profile picture file from storage.
     */
    public function deleteProfilePicture(): void
    {
        if ($this->profile_picture && \Illuminate\Support\Facades\Storage::exists($this->profile_picture)) {
            \Illuminate\Support\Facades\Storage::delete($this->profile_picture);
        }
    }

    /**
     * Sync the enum role with Spatie role.
     */
    public function syncSpatieRole(): void
    {
        // Remove all existing roles
        $this->syncRoles([]);

        // Assign the role based on enum value
        if ($this->role) {
            $this->assignRole($this->role);
        }
    }

    /**
     * Boot method to automatically sync Spatie roles when role changes.
     */
    protected static function booted(): void
    {
        static::created(function ($user) {
            $user->syncSpatieRole();
        });

        static::updated(function ($user) {
            if ($user->wasChanged('role')) {
                $user->syncSpatieRole();
            }
        });
    }
}
