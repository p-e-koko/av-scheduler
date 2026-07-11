<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check");
            DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (status IN ('pending','confirmed','complete','to_assign','canceled'))");
            return;
        }

        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete','to_assign','canceled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check");
            DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (status IN ('pending','confirmed','complete'))");
            return;
        }

        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete') NOT NULL DEFAULT 'pending'");
    }
};
