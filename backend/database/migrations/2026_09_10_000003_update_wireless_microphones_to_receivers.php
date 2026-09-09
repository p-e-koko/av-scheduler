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
                if (!Schema::hasColumn('wireless_microphones', 'channels_count')) {
                    $table->integer('channels_count')->default(1)->after('brand_model');
                }
                if (!Schema::hasColumn('wireless_microphones', 'channels')) {
                    $table->json('channels')->nullable()->after('channels_count');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('wireless_microphones')) {
            Schema::table('wireless_microphones', function (Blueprint $table) {
                if (Schema::hasColumn('wireless_microphones', 'channels_count')) {
                    $table->dropColumn('channels_count');
                }
                if (Schema::hasColumn('wireless_microphones', 'channels')) {
                    $table->dropColumn('channels');
                }
            });
        }
    }
};
