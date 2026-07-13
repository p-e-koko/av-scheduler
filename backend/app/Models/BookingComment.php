<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class BookingComment extends Model
{
    use HasUuid;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'media_booking_id',
        'user_id',
        'content',
    ];

    public function booking()
    {
        return $this->belongsTo(MediaBooking::class, 'media_booking_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
