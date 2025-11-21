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
}
