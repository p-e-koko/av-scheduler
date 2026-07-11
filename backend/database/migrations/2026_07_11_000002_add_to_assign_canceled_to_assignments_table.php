<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // The assignments.status column is an ENUM — add the new 'to_assign' and 'canceled' values.
        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete','to_assign','canceled') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE assignments MODIFY COLUMN status ENUM('pending','confirmed','complete') NOT NULL DEFAULT 'pending'");
    }
};
