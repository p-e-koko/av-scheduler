<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingSupervisorSchedule extends Model
{
    use HasFactory;

    protected $table = 'marketing_supervisor_schedules';

    protected $fillable = [
        'user_id',
        'title',
        'start_datetime',
        'end_datetime',
        'notes',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime'   => 'datetime',
    ];

    /**
     * The marketing supervisor who owns this schedule entry.
     */
    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
