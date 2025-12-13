<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Carbon\Carbon;

class RecalculateUserHours extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:recalculate-hours';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate remaining hours for all users based on accepted assignments for the current week';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting hours recalculation...');

        $users = User::all();
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        $bar = $this->output->createProgressBar(count($users));
        $bar->start();

        foreach ($users as $user) {
            // Get accepted assignments for this week
            $acceptedAssignments = $user->assignments()
                ->wherePivot('status', 'accepted')
                ->whereBetween('event_start_datetime', [$startOfWeek, $endOfWeek])
                ->get();

            $workedHours = 0;
            foreach ($acceptedAssignments as $assignment) {
                $duration = abs($assignment->event_end_datetime->diffInMinutes($assignment->event_start_datetime) / 60);
                $workedHours += $duration;
            }

            $user->remaining_hours_this_week = max(0, $user->promised_hours_per_week - $workedHours);
            $user->save();

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Recalculation complete.');
    }
}
