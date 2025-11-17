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

// Protected User Management Routes - Role-Based Access Control
Route::middleware('auth:sanctum')->group(function () {
    
    // User Management - Admin only
    Route::middleware(['role:admin'])->group(function () {
        Route::apiResource('users', UserController::class)->except(['index', 'show']);
        Route::prefix('users')->group(function () {
            Route::get('/trashed', [UserController::class, 'trashed']);
            Route::post('/{id}/restore', [UserController::class, 'restore']);
            Route::delete('/{id}/force', [UserController::class, 'forceDelete']);
        });
    });

    // View Users - Admin, Supervisor, Coordinator
    Route::middleware(['role:admin,supervisor,coordinator'])->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });

    // User can view and edit own profile
    Route::get('/profile', [AuthController::class, 'me']);
    Route::put('/profile', function (Request $request) {
        $user = $request->user();
        $user->update($request->only(['name', 'email', 'student_id', 'username']));
        return response()->json(['user' => new \App\Http\Resources\UserResource($user)]);
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
