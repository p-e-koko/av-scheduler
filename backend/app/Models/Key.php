<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Key extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'key_management';

    protected $primaryKey = 'id';

    protected $fillable = [
        'code',
        'description',
        'assigned_user_id',
    ];

    /**
     * Get the user this key is originally assigned to.
     */
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * Get all checkouts for this key.
     */
    public function checkouts()
    {
        return $this->hasMany(KeyCheckout::class, 'key_id');
    }

    /**
     * Get the current active checkout (not returned yet).
     */
    public function currentCheckout()
    {
        return $this->hasOne(KeyCheckout::class, 'key_id')->whereNull('returned_at');
    }

    /**
     * Check if the key is currently available.
     */
    public function isAvailable(): bool
    {
        return !$this->currentCheckout()->exists();
    }
}
