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

// Public Authentication Routes with Rate Limiting
Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Protected Authentication Routes
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

// Protected User Management Routes - Role-Based Access Control
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // User Management - Admin only with sensitive rate limiting
    Route::middleware(['role:admin', 'throttle:sensitive'])->group(function () {
        Route::apiResource('users', UserController::class)->except(['index', 'show']);
        Route::prefix('users')->group(function () {
            Route::post('/create-with-files', [UserController::class, 'storeWithFiles']);
            Route::post('/{user}/update-with-files', [UserController::class, 'updateWithFiles']);
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
