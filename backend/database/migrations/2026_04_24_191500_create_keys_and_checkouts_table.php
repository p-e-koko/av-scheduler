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
        // Drop if they exist to fix previous schema mismatches (e.g. bigint vs uuid)
        Schema::dropIfExists('key_checkouts');
        Schema::dropIfExists('key_management');

        Schema::create('key_management', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->text('description');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('key_checkouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('key_id')->constrained('key_management')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('student_id');
            $table->text('purpose');
            $table->timestamp('checked_out_at')->useCurrent();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('key_checkouts');
        Schema::dropIfExists('key_management');
    }
};
