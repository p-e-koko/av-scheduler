<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class KeyCheckout extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'key_checkouts';

    protected $primaryKey = 'id';

    protected $fillable = [
        'key_id',
        'user_id',
        'student_id',
        'purpose',
        'checked_out_at',
        'returned_at',
    ];

    protected $casts = [
        'checked_out_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    /**
     * Get the key for this checkout.
     */
    public function key()
    {
        return $this->belongsTo(Key::class, 'key_id');
    }

    /**
     * Get the user who checked out the key.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
