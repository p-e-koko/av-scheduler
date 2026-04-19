<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cable extends Model
{
    use HasFactory, SoftDeletes, HasUuid;

    protected $table = 'cables';

    /**
     * The primary key associated with the table.
     */
    protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'length',
        'amount',
        'category',
        'barcode',
        'location',
        'purchase_date',
        'condition',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'purchase_date' => 'date',
        'amount' => 'integer',
    ];

    /**
     * Get all checkouts for this cable.
     */
    public function checkouts()
    {
        return $this->hasMany(CableCheckout::class, 'cable_id');
    }

    /**
     * Get active checkouts (not fully returned).
     */
    public function activeCheckouts()
    {
        return $this->hasMany(CableCheckout::class, 'cable_id')->whereNull('returned_at');
    }

    /**
     * Generate a unique barcode based on the given location.
     * Format: AV2026C{loc}{num}
     * e.g. "Studio A" -> "AV2026CST001"
     */
    public static function generateBarcode(string $location): string
    {
        // Take first 2 letters of location, uppercase
        $locPart = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $location), 0, 2));
        $prefix = 'AV2026C' . $locPart;

        $barcodes = self::withTrashed()
            ->where('barcode', 'like', "{$prefix}%")
            ->pluck('barcode');

        $maxNum = 0;
        foreach ($barcodes as $barcode) {
            // Suffix starts after AV2026C + 2 chars of location (Total 9 chars)
            $suffix = substr($barcode, 9);
            // Stripping any potential sub-item suffixes like -1
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
}
