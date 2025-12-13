<?php

namespace Database\Factories;

use App\Models\Assignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssignmentFactory extends Factory
{
    protected $model = Assignment::class;

    public function definition(): array
    {
        return [
            'assignment_name' => $this->faker->sentence,
            'event_name' => $this->faker->word,
            'event_location' => $this->faker->address,
            'event_start_datetime' => now()->addDay(),
            'event_end_datetime' => now()->addDay()->addHours(2),
            'description' => $this->faker->paragraph,
            'status' => 'pending',
            'created_by' => User::factory(),
        ];
    }
}
