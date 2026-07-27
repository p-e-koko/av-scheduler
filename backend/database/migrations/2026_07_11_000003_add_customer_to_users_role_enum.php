<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','supervisor','coordinator','student','customer'))");
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','coordinator','student','customer') NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','supervisor','coordinator','student'))");
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','supervisor','coordinator','student') NULL");
    }
};
