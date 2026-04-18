<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CableCheckout extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'cable_checkouts';

    /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'cable_id',
        'user_id',
        'quantity_checked_out',
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
        'quantity_checked_out' => 'integer',
    ];

    /**
     * Get the cable for this checkout.
     */
    public function cable()
    {
        return $this->belongsTo(Cable::class, 'cable_id');
    }

    /**
     * Get the user who checked out the cable.
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
     * Check if this checkout is still active.
     */
    public function isActive(): bool
    {
        return is_null($this->returned_at);
    }
}
