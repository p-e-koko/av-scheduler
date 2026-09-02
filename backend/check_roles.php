<?php

// Check roles in the database
$mysqli = new mysqli("127.0.0.1", "root", "pw:monKey;", "laravel");

if ($mysqli->connect_errno) {
    echo "Failed to connect to MySQL: " . $mysqli->connect_error;
    exit();
}

$result = $mysqli->query("SELECT name FROM roles");
$roles = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        $roles[] = $row['name'];
    }
}
echo "Roles:\n";
print_r($roles);

$result = $mysqli->query("SELECT name FROM permissions");
$permissions = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        $permissions[] = $row['name'];
    }
}
echo "\nPermissions count: " . count($permissions) . "\n";
// print_r($permissions);

$mysqli->close();
