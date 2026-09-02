<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$users = App\Models\User::with('roles')->get();
foreach($users as $u) {
    if($u->getDepartment() === 'marketing' || count($u->roles) > 0) {
        echo $u->email . " - Dept: " . $u->getDepartment() . " - Roles: " . json_encode($u->roles->pluck('name')) . "\n";
    }
}
