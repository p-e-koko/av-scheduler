<?php
try {
    $data = [
        "name" => "Test", 
        "category" => "Test", 
        "location" => "Chapel", 
        "barcode" => App\Models\Equipment::generateBarcode("Chapel"), 
        "status" => "available"
    ];
    $e = App\Models\Equipment::create($data); 
    echo "OK"; 
} catch(\Throwable $e) { 
    echo "ERROR " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine(); 
}
