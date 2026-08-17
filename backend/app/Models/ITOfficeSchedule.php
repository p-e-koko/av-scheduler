<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ITOfficeSchedule extends Model
{
    use HasUuid, SoftDeletes;

    protected $table = 'it_office_schedules';

    protected $fillable = [
        'student_id',
        'created_by',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
