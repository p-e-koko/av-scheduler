<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Public Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Protected Authentication Routes
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

// Protected User Management Routes
Route::middleware('auth:sanctum')->group(function () {
    // RESTful User Resource Routes
    Route::apiResource('users', UserController::class);

    // Additional User Routes for Soft Deletes
    Route::prefix('users')->group(function () {
        Route::get('/trashed', [UserController::class, 'trashed']);
        Route::post('/{id}/restore', [UserController::class, 'restore']);
        Route::delete('/{id}/force', [UserController::class, 'forceDelete']);
    });
});

// Health Check Route
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'service' => 'Laravel API'
    ]);
});
