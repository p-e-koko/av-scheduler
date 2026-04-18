<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EquipmentCheckout extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'equipment_checkouts';

    /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'equipment_id',
        'user_id',
        'event_note',
        'checked_out_at',
        'returned_at',
        'return_note',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'checked_out_at' => 'datetime',
        'returned_at'    => 'datetime',
    ];

    /**
     * Get the equipment for this checkout.
     */
    public function equipment()
    {
        return $this->belongsTo(Equipment::class, 'equipment_id');
    }

    /**
     * Get the user who checked out the equipment.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope: only active checkouts (not returned).
     */
    public function scopeActive($query)
    {
        return $query->whereNull('returned_at');
    }

    /**
     * Scope: only returned checkouts.
     */
    public function scopeReturned($query)
    {
        return $query->whereNotNull('returned_at');
    }

    /**
     * Check if this checkout is still active.
     */
    public function isActive(): bool
    {
        return is_null($this->returned_at);
    }
}
