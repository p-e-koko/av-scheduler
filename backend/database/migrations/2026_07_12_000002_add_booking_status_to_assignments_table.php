<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adds the 'booking' status to the assignments table ENUM/CHECK constraint.
 *
 * A freshly created media booking spawns a linked Assignment in the 'booking'
 * state (pre-approval). Once a coordinator approves the booking, the
 * assignment is promoted to 'to_assign' so it enters the staff assignment queue.
 */
return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check");
            DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (status IN ('booking','pending','confirmed','complete','to_assign','canceled'))");
            return;
        }

        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('booking','pending','confirmed','complete','to_assign','canceled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check");
            DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (status IN ('pending','confirmed','complete','to_assign','canceled'))");
            return;
        }

        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete','to_assign','canceled') NOT NULL DEFAULT 'pending'");
    }
};
