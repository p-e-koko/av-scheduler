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
        'image_path',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'image_url',
    ];

    /**
     * Get full URL for the equipment image.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        return asset('storage/' . $this->image_path);
    }

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
     * Format: AV2026E{loc}{num}
     * e.g. "Studio A" -> "AV2026EST001"
     */
    public static function generateBarcode(string $location): string
    {
        $cleanLoc = preg_replace('/[^A-Za-z]/', '', $location);
        $locPart = strtoupper(substr($cleanLoc, 0, 2));
        if (strlen($locPart) < 2) {
            $locPart = str_pad($locPart, 2, 'X', STR_PAD_RIGHT);
        }
        $prefix = 'AV2026E' . $locPart;

        $barcodes = self::withTrashed()
            ->where('barcode', 'like', "{$prefix}%")
            ->pluck('barcode');

        $maxNum = 0;
        $prefixLen = strlen($prefix);
        foreach ($barcodes as $barcode) {
            $suffix = substr($barcode, $prefixLen);
            if (str_contains($suffix, '-')) {
                $suffix = explode('-', $suffix)[0];
            }
            $num = (int) $suffix;
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
