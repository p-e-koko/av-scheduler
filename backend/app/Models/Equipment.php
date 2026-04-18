<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Equipment extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'equipment';

    /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'category',
        'barcode',
        'location',
        'purchase_date',
        'condition',
        'status',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'purchase_date' => 'date',
    ];

    /**
     * Get all checkouts for this equipment.
     */
    public function checkouts()
    {
        return $this->hasMany(EquipmentCheckout::class, 'equipment_id');
    }

    /**
     * Get the current active checkout (not returned yet).
     */
    public function currentCheckout()
    {
        return $this->hasOne(EquipmentCheckout::class, 'equipment_id')->whereNull('returned_at');
    }

    /**
     * Scope: available equipment.
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    /**
     * Scope: checked-out equipment.
     */
    public function scopeCheckedOut($query)
    {
        return $query->where('status', 'checked_out');
    }

    /**
     * Generate a unique barcode based on the given location.
     * Format: E{loc}{num}
     * e.g. "Studio A" -> "EST001"
     */
    public static function generateBarcode(string $location): string
    {
        // Take first 2 letters of location, uppercase
        $locPart = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $location), 0, 2));
        $prefix = 'E' . $locPart;

        // Find highest existing number for this prefix
        $barcodes = self::withTrashed()
            ->where('barcode', 'like', "{$prefix}%")
            ->pluck('barcode');

        $maxNum = 0;
        foreach ($barcodes as $barcode) {
            $num = (int) substr($barcode, 3);
            if ($num > $maxNum) {
                $maxNum = $num;
            }
        }

        $nextNum = $maxNum + 1;

        return $prefix . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Check if equipment is currently available.
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    /**
     * Check if equipment is currently checked out.
     */
    public function isCheckedOut(): bool
    {
        return $this->status === 'checked_out';
    }
}
