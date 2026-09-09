<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WirelessMicrophone extends Model
{
    use HasFactory, HasUuid, SoftDeletes;

    protected $table = 'wireless_microphones';

    protected $fillable = [
        'brand_model',
        'type',
        'channels_count',
        'channels',
        'frequency',
        'location',
        'notes',
    ];

    protected $casts = [
        'channels' => 'array',
        'channels_count' => 'integer',
    ];
}
