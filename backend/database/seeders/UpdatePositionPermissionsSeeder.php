<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UpdatePositionPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create new position-related permissions
        $positionPermissions = [
            'view positions',
            'create positions',
            'edit positions',
            'delete positions',
            'manage user positions',
        ];

        foreach ($positionPermissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ], [
                'id' => (string) \Illuminate\Support\Str::uuid(),
            ]);
        }

        // Find existing coordinator role and add position permissions
        $coordinatorRole = Role::where('name', 'coordinator')->first();
        if ($coordinatorRole) {
            $coordinatorRole->givePermissionTo($positionPermissions);
            echo "Added position permissions to coordinator role.\n";
        } else {
            echo "Coordinator role not found.\n";
        }
    }
}
