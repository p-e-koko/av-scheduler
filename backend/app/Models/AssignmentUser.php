<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Relations\Pivot;

class AssignmentUser extends Pivot
{
    use HasUuid;

    protected $table = 'assignment_users';

    public $incrementing = false;

    protected $keyType = 'string';
}
