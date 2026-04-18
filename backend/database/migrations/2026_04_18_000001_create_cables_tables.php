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
        Schema::create('cables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('length');
            $table->integer('amount')->default(0);
            $table->string('category')->default('Cable');
            $table->string('barcode')->unique();
            $table->string('location');
            $table->date('purchase_date')->nullable();
            $table->enum('condition', ['good', 'fair', 'poor'])->default('good');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();
        });

        Schema::create('cable_checkouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cable_id')->constrained('cables')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('quantity_checked_out');
            $table->string('event_note')->nullable();
            $table->timestamp('checked_out_at')->useCurrent();
            $table->timestamp('returned_at')->nullable();
            $table->string('return_note')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cable_checkouts');
        Schema::dropIfExists('cables');
    }
};
