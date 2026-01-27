<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Availability extends Model
{
    use HasUuid;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'availability';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'student_id',
        'title',
        'recurrence_id',
        'date',
        'start_time',
        'end_time',
        'status',
    ];

    /**
     * Get the user that owns the availability.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get duration in minutes.
     */
    public function getDurationInMinutes(): int
    {
        $start = \Carbon\Carbon::createFromFormat('H:i:s', $this->start_time);
        $end = \Carbon\Carbon::createFromFormat('H:i:s', $this->end_time);

        return abs($end->diffInMinutes($start));
    }

    /**
     * Get formatted time range.
     */
    public function getFormattedTimeRange(): string
    {
        $start = \Carbon\Carbon::createFromFormat('H:i:s', $this->start_time)->format('g:i A');
        $end = \Carbon\Carbon::createFromFormat('H:i:s', $this->end_time)->format('g:i A');

        return "{$start} - {$end}";
    }

    /**
     * Check if the availability date is in the past.
     */
    public function isPast(): bool
    {
        return \Carbon\Carbon::parse($this->date)->isPast();
    }

    /**
     * Check if the availability date is today.
     */
    public function isToday(): bool
    {
        return \Carbon\Carbon::parse($this->date)->isToday();
    }
}
