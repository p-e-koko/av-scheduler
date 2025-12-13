<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get start and end of current week
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        $users = User::where('role', 'student')->get();

        foreach ($users as $user) {
            // Get accepted assignments for this week
            $acceptedAssignments = $user->assignments()
                ->wherePivot('status', 'accepted')
                ->whereBetween('event_start_datetime', [$startOfWeek, $endOfWeek])
                ->get();

            $workedHours = 0;
            foreach ($acceptedAssignments as $assignment) {
                $duration = $assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60;
                $workedHours += $duration;
            }

            // Recalculate remaining hours
            $user->remaining_hours_this_week = max(0, $user->promised_hours_per_week - $workedHours);
            $user->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse
    }
};
