<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WirelessMicrophone extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'wireless_microphones';

    protected $primaryKey = 'id';

    protected $fillable = [
        'brand_model',
        'frequency',
        'location',
        'notes',
    ];
}
