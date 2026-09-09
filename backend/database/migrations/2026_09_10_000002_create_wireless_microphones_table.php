<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wireless_microphones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('brand_model');
            $table->string('type')->default('Digital');
            $table->integer('channels_count')->default(1);
            $table->json('channels')->nullable();
            $table->string('frequency')->nullable();
            $table->string('location');
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wireless_microphones');
    }
};
