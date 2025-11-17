<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('promised_hours_per_week', 5, 2)->default(0)->after('role');
            $table->decimal('remaining_hours_this_week', 5, 2)->default(0)->after('promised_hours_per_week');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['promised_hours_per_week', 'remaining_hours_this_week']);
        });
    }
};
