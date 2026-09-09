<?php
use Illuminate\Http\UploadedFile;
$dummyFile = '/tmp/dummy.jpg';
file_put_contents($dummyFile, 'not-a-real-image');
$file = new UploadedFile($dummyFile, 'dummy.jpg', 'image/jpeg', null, true);

$controller = new App\Http\Controllers\Api\EquipmentController();
$reflection = new ReflectionClass($controller);
$method = $reflection->getMethod('processAndStoreImage');
$method->setAccessible(true);
try {
    $result = $method->invoke($controller, $file);
    echo "OK: " . $result;
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine();
}
