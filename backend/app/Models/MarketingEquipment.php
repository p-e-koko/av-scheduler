<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketingEquipment extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'marketing_equipment';

    protected $fillable = [
        'name',
        'model',
        'serial_number',
        'category',
        'quantity',
        'description',
        'status',
    ];

    protected $casts = [
        'quantity'  => 'integer',
    ];

    /**
     * Assignments that use this equipment.
     */
    public function assignments()
    {
        return $this->belongsToMany(
            Assignment::class,
            'marketing_assignment_equipment',
            'marketing_equipment_id',
            'assignment_id'
        )->withPivot('quantity_used')->withTimestamps();
    }

    /**
     * Pivot records for this equipment.
     */
    public function assignmentEquipment()
    {
        return $this->hasMany(MarketingAssignmentEquipment::class, 'marketing_equipment_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeInUse($query)
    {
        return $query->where('status', 'in_use');
    }

    // -------------------------------------------------------------------------
    // Dynamic Status
    // -------------------------------------------------------------------------

    /**
     * Compute real-time status based on active assignments.
     * Call this to refresh the status column programmatically.
     */
    public function refreshStatus(): void
    {
        $now = now();
        $inUse = $this->assignments()
            ->where('event_start_datetime', '<=', $now)
            ->where('event_end_datetime', '>=', $now)
            ->exists();

        if ($this->status !== 'maintenance') {
            $this->status = $inUse ? 'in_use' : 'available';
            $this->save();
        }
    }

    public function isCurrentlyInUse(): bool
    {
        $now = now();
        return $this->assignments()
            ->where('event_start_datetime', '<=', $now)
            ->where('event_end_datetime', '>=', $now)
            ->exists();
    }
}
