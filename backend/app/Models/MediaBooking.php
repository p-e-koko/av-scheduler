<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MediaBooking extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'customer_id',
        'event_name',
        'location',
        'start_datetime',
        'end_datetime',
        'equipment_request',
        'ac_required',
        'spotlight_required',
        'led_light_required',
        'status',
        'cancel_reason',
        'canceled_by',
        'assignment_id',
    ];

    protected $casts = [
        'start_datetime'     => 'datetime',
        'end_datetime'       => 'datetime',
        'ac_required'        => 'boolean',
        'spotlight_required' => 'boolean',
        'led_light_required' => 'boolean',
    ];

    /** Customer who made this booking */
    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /** The assignment auto-created for this booking */
    public function assignment()
    {
        return $this->belongsTo(Assignment::class, 'assignment_id');
    }

    /**
     * Check if the given location + time slot is already booked.
     * Same location cannot have overlapping bookings.
     * Same time + different location IS allowed.
     */
    public static function hasConflict(string $location, string $start, string $end, ?string $excludeId = null): bool
    {
        $query = static::where('location', $location)
            ->whereNotIn('status', ['canceled'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_datetime', [$start, $end])
                  ->orWhereBetween('end_datetime', [$start, $end])
                  ->orWhere(function ($inner) use ($start, $end) {
                      $inner->where('start_datetime', '<=', $start)
                            ->where('end_datetime', '>=', $end);
                  });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}
