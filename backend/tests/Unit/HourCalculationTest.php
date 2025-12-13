<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\User;
use App\Models\Assignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class HourCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolePermissionSeeder::class);
    }

    public function test_remaining_hours_calculation()
    {
        // Create a student
        $student = User::factory()->create([
            'role' => 'student',
            'promised_hours_per_week' => 10,
            'remaining_hours_this_week' => 10,
        ]);

        // 1. Assign a user (pending)
        // In the controller, assignUser subtracts hours ONLY if status is accepted.
        // But wait, if I assign as pending, hours should NOT change?
        // Let's verify this behavior.

        $assignment = Assignment::factory()->create([
            'event_start_datetime' => Carbon::now()->addDay()->setHour(10)->setMinute(0),
            'event_end_datetime' => Carbon::now()->addDay()->setHour(12)->setMinute(0), // 2 hours
            'created_by' => User::factory()->create(['role' => 'coordinator'])->id,
        ]);

        $response = $this->actingAs($student->creator ?? User::factory()->create(['role' => 'coordinator']))
                         ->postJson("/api/assignments/{$assignment->id}/assign-user", [
                             'user_id' => $student->id,
                             'status' => 'pending'
                         ]);

        $response->assertStatus(200);
        $student->refresh();

        // If pending, hours should NOT be subtracted in backend?
        // Controller says: if ($status === 'accepted') { subtract }
        // So remaining should be 10.
        $this->assertEquals(10, $student->remaining_hours_this_week, "Pending assignment should not subtract hours in backend");

        // 2. Student accepts assignment
        $response = $this->actingAs($student)
                         ->postJson("/api/assignments/{$assignment->id}/accept");

        $response->assertStatus(200);
        $student->refresh();

        // Now hours should be subtracted.
        $this->assertEquals(8, $student->remaining_hours_this_week, "Accepted assignment should subtract hours");

        // 3. Student rejects assignment
        // First, let's reset to a state where we can reject.
        // If I reject, I should get hours back.

        $response = $this->actingAs($student)
                         ->postJson("/api/assignments/{$assignment->id}/reject", [
                             'reason' => 'Cannot make it'
                         ]);

        $response->assertStatus(200);
        $student->refresh();

        // Hours should be restored.
        $this->assertEquals(10, $student->remaining_hours_this_week, "Rejected assignment should restore hours");
    }

    public function test_assign_accepted_directly()
    {
        $student = User::factory()->create([
            'role' => 'student',
            'promised_hours_per_week' => 10,
            'remaining_hours_this_week' => 10,
        ]);

        $assignment = Assignment::factory()->create([
            'event_start_datetime' => Carbon::now()->addDay()->setHour(10)->setMinute(0),
            'event_end_datetime' => Carbon::now()->addDay()->setHour(12)->setMinute(0), // 2 hours
            'created_by' => User::factory()->create(['role' => 'coordinator'])->id,
        ]);

        $coordinator = User::factory()->create(['role' => 'coordinator']);

        $response = $this->actingAs($coordinator)
                         ->postJson("/api/assignments/{$assignment->id}/assign-user", [
                             'user_id' => $student->id,
                             'status' => 'accepted'
                         ]);

        $response->assertStatus(200);
        $student->refresh();

        $this->assertEquals(8, $student->remaining_hours_this_week, "Directly accepted assignment should subtract hours");
    }
}
