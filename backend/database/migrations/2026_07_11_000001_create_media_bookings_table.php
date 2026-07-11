<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('media_bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('customer_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_name');
            $table->string('location');                   // e.g. "Studio A", "Room 201"
            $table->dateTime('start_datetime');
            $table->dateTime('end_datetime');
            $table->text('equipment_request')->nullable(); // free-text, e.g. "4 wireless mics"
            $table->boolean('ac_required')->default(false);
            $table->boolean('spotlight_required')->default(false);
            $table->boolean('led_light_required')->default(false);
            $table->string('status')->default('pending');
            // status values: 'pending', 'to_assign', 'confirmed', 'canceled', 'complete'
            $table->text('cancel_reason')->nullable();
            $table->string('canceled_by')->nullable(); // 'customer' | 'coordinator'
            $table->foreignUuid('assignment_id')->nullable()->constrained('assignments')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_bookings');
    }
};
