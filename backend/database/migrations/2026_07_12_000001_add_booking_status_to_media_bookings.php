<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Documents the new 'booking' status used for media bookings.
 *
 * media_bookings.status is a plain string column (no real ENUM/CHECK
 * constraint), so no structural change is required to accept the new value.
 * We only update the column comment + default so freshly created bookings
 * start in the 'booking' state (awaiting coordinator approval) instead of
 * jumping straight to 'to_assign'.
 *
 * Lifecycle:
 *   booking → (approve) → to_assign → pending → confirmed → complete
 *   booking → (reject)  → canceled
 */
return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE media_bookings ALTER COLUMN status SET DEFAULT 'booking'");
            DB::statement("COMMENT ON COLUMN media_bookings.status IS 'status: booking|to_assign|pending|confirmed|canceled|complete'");
        } else {
            // Update the column default + comment. Status values:
            // 'booking', 'to_assign', 'pending', 'confirmed', 'canceled', 'complete'
            DB::statement("ALTER TABLE media_bookings MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'booking'");
            DB::statement("ALTER TABLE media_bookings COMMENT 'status: booking|to_assign|pending|confirmed|canceled|complete'");
        }
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE media_bookings MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'");
    }
};
