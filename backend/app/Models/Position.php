<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Position extends Model
{
    use HasFactory, HasUuid;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Scope to filter active positions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter inactive positions.
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Get the users assigned to this position in assignments.
     */
    public function assignedUsers()
    {
        return $this->hasManyThrough(
            User::class,
            'assignment_users',
            'position',
            'id',
            'name',
            'id'
        );
    }

    /**
     * Check if the position is currently in use.
     */
    public function isInUse(): bool
    {
        return DB::table('assignment_users')
            ->where('position', $this->name)
            ->exists();
    }
}
