<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_assignment_equipment', function (Blueprint $table) {
            $table->id();
            $table->uuid('assignment_id');
            $table->uuid('marketing_equipment_id');
            $table->integer('quantity_used')->default(1);
            $table->timestamps();

            $table->foreign('assignment_id')->references('id')->on('assignments')->onDelete('cascade');
            $table->foreign('marketing_equipment_id')->references('id')->on('marketing_equipment')->onDelete('cascade');

            $table->unique(['assignment_id', 'marketing_equipment_id'], 'mk_assign_equip_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_assignment_equipment');
    }
};
