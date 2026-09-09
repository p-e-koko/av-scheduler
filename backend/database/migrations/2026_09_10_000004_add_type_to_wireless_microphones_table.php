<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('wireless_microphones')) {
            Schema::table('wireless_microphones', function (Blueprint $table) {
                if (!Schema::hasColumn('wireless_microphones', 'type')) {
                    $table->string('type')->default('Digital')->after('brand_model');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('wireless_microphones')) {
            Schema::table('wireless_microphones', function (Blueprint $table) {
                if (Schema::hasColumn('wireless_microphones', 'type')) {
                    $table->dropColumn('type');
                }
            });
        }
    }
};
