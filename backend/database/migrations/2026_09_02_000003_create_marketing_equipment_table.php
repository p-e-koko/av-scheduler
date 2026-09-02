<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_equipment', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable()->unique();
            $table->string('category')->nullable();
            $table->integer('quantity')->default(1);
            $table->text('description')->nullable();
            $table->enum('status', ['available', 'in_use', 'maintenance'])->default('available');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_equipment');
    }
};
