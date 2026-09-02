<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class MarketingAssignmentEquipment extends Pivot
{
    protected $table = 'marketing_assignment_equipment';

    public $incrementing = true;

    protected $fillable = [
        'assignment_id',
        'marketing_equipment_id',
        'quantity_used',
    ];

    protected $casts = [
        'quantity_used' => 'integer',
    ];

    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    public function equipment()
    {
        return $this->belongsTo(MarketingEquipment::class, 'marketing_equipment_id');
    }
}
