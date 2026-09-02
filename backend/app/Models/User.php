<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Notifications\VerifyEmailQueued;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes, HasRoles, HasUuid, HasPushSubscriptions;

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
        'phone_number',
        'password',
        'provider',
        'provider_id',
        'avatar',
        'role',
        'is_approved',
        'is_IT',
        'is_it_only',
        'profile_picture',
        'promised_hours_per_week',
        'remaining_hours_this_week',
        'google_access_token',
        'google_refresh_token',
        'google_token_expires_at',
        'microsoft_access_token',
        'microsoft_refresh_token',
        'microsoft_token_expires_at',
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
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['profile_picture_url', 'remaining_hours'];

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
            'is_approved' => 'boolean',
            'is_IT' => 'boolean',
            'is_it_only' => 'boolean',
            'microsoft_token_expires_at' => 'datetime',
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
                    ->using(AssignmentUser::class)
                    ->withPivot('status', 'checked_in', 'position', 'rejection_reason', 'is_modified')
                    ->withTimestamps();
    }

    /**
     * Get the availability records for the user.
     */
    public function availability()
    {
        return $this->hasMany(Availability::class, 'student_id');
    }

    /** Media bookings made by this customer */
    public function mediaBookings()
    {
        return $this->hasMany(MediaBooking::class, 'customer_id');
    }

    /**
     * Get the IT office schedule entries for this IT assistant.
     */
    public function itOfficeSchedules()
    {
        return $this->hasMany(ITOfficeSchedule::class, 'student_id');
    }

    /**
     * Get marketing supervisor schedule entries for this supervisor.
     */
    public function marketingSupervisorSchedules()
    {
        return $this->hasMany(MarketingSupervisorSchedule::class, 'user_id');
    }

    /**
     * Check if this user is an IT Assistant.
     */
    public function isITAssistant(): bool
    {
        return (bool) $this->is_IT;
    }

    /**
     * Check if this user is IT-only (restricted access).
     */
    public function isITOnly(): bool
    {
        return (bool) $this->is_it_only;
    }

    /** Check if user is a customer */
    public function isCustomer(): bool
    {
        return $this->hasRole('customer');
    }

    /**
     * Get the equipment checkouts for the user.
     */
    public function equipmentCheckouts()
    {
        return $this->hasMany(EquipmentCheckout::class, 'user_id');
    }

    /**
     * Check if user has a specific role.
     * Removed manual override to use Spatie's hasRole method.
     */
    /*
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }
    */

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
     * Check if user is a marketing supervisor.
     */
    public function isMarketingSupervisor(): bool
    {
        return $this->hasRole('marketing_supervisor');
    }

    /**
     * Check if user is a marketing coordinator.
     */
    public function isMarketingCoordinator(): bool
    {
        return $this->hasRole('marketing_coordinator');
    }

    /**
     * Check if user is a student ambassador (marketing student).
     */
    public function isStudentAmbassador(): bool
    {
        return $this->hasRole('student_ambassador');
    }

    /**
     * Get the department this user belongs to.
     * Returns 'marketing' for all marketing roles, 'av_it' for all others.
     */
    public function getDepartment(): string
    {
        $marketingRoles = ['marketing_supervisor', 'marketing_coordinator', 'student_ambassador'];
        foreach ($marketingRoles as $role) {
            if ($this->hasRole($role)) {
                return 'marketing';
            }
        }
        return 'av_it';
    }

    /**
     * Check if this user belongs to the marketing department.
     */
    public function isMarketingDepartment(): bool
    {
        return $this->getDepartment() === 'marketing';
    }

    /**
     * Check if this user belongs to the AV-IT department.
     */
    public function isAvItDepartment(): bool
    {
        return $this->getDepartment() === 'av_it';
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
     * Get the remaining hours for the current week.
     */
    public function getRemainingHoursAttribute()
    {
        return $this->remaining_hours_this_week;
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
        // $this->syncRoles([]);

        // Assign the role based on enum value
        if ($this->role) {
            $this->assignRole($this->role);
        }
    }

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        \Illuminate\Support\Facades\Log::info('Triggering email verification for user: ' . $this->email);
        $this->notify(new VerifyEmailQueued);
        \Illuminate\Support\Facades\Log::info('Email verification notification dispatched.');
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
