<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\UserController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;

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
    // Social Login (Microsoft) - Wrapped in 'web' middleware for Session/State support
    Route::middleware(['web'])->group(function () {
        Route::get('/microsoft/redirect', [AuthController::class, 'redirectToProvider'])->defaults('provider', 'microsoft');
        Route::get('/microsoft/callback', [AuthController::class, 'handleProviderCallback'])->defaults('provider', 'microsoft');
    });
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerificationEmail'])
        ->middleware(['throttle:6,1'])
        ->name('verification.send');
});

// Email Verification Route
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// CSRF Token Route - Available to all stateful domains
Route::get('/sanctum/csrf-cookie', function () {
    return response()->noContent();
});

Route::get('/csrf-token', function () {
    return response()->json(['csrf_token' => csrf_token()]);
});

// Protected Authentication Routes
Route::middleware(['auth:sanctum'])->prefix('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

// Protected User Management Routes - Role-Based Access Control
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    // User Management - Admin only with sensitive rate limiting
    Route::middleware(['role:admin', 'throttle:sensitive'])->group(function () {
        Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
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

    // Assignment Management Routes - Role-Based Access Control

    // Assignment Management - Coordinator only (Full CRUD access)
    Route::middleware(['role:coordinator', 'throttle:sensitive'])->group(function () {
        Route::apiResource('assignments', AssignmentController::class)->except(['index', 'show']);
        Route::prefix('assignments')->group(function () {
            Route::get('/trashed', [AssignmentController::class, 'trashed']);
            Route::post('/{id}/restore', [AssignmentController::class, 'restore']);
            Route::delete('/{id}/force', [AssignmentController::class, 'forceDelete']);

            // User assignment management
            Route::post('/{assignment}/assign-user', [AssignmentController::class, 'assignUser']);
            Route::post('/{assignment}/unassign-user', [AssignmentController::class, 'unassignUser']);
            Route::post('/{assignment}/update-user-position', [AssignmentController::class, 'updateUserPosition']);
            Route::post('/{assignment}/check-in-user', [AssignmentController::class, 'checkInUser']);
            Route::post('/{assignment}/check-out-user', [AssignmentController::class, 'checkOutUser']);
        });

        // Position Management - Coordinator only
        Route::apiResource('positions', \App\Http\Controllers\Api\PositionController::class);
        Route::get('positions-active', [\App\Http\Controllers\Api\PositionController::class, 'active']);
    });

    // View Assignments - Supervisor, Coordinator, Students (Read-only access)
    Route::middleware(['role:supervisor,coordinator,student'])->group(function () {
        Route::get('/assignments', [AssignmentController::class, 'index']);
        Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    });

    // Student-specific assignment routes
    Route::middleware(['role:student'])->group(function () {
        Route::get('/my-assignments', [AssignmentController::class, 'myAssignments']);
        Route::post('/assignments/{assignment}/accept', [AssignmentController::class, 'acceptAssignment']);
        Route::post('/assignments/{assignment}/reject', [AssignmentController::class, 'rejectAssignment']);
        // Students can check themselves in/out of their own assignments
        Route::post('/assignments/{assignment}/check-in', function (Request $request, \App\Models\Assignment $assignment) {
            $request->merge(['user_id' => $request->user()->id]);
            return app(AssignmentController::class)->checkInUser($request, $assignment);
        });
        Route::post('/assignments/{assignment}/check-out', function (Request $request, \App\Models\Assignment $assignment) {
            $request->merge(['user_id' => $request->user()->id]);
            return app(AssignmentController::class)->checkOutUser($request, $assignment);
        });
        Route::post('/assignments/{assignment}/add-to-calendar', [AssignmentController::class, 'addToCalendar']);
        Route::post('/assignments/{assignment}/remove-from-calendar', [AssignmentController::class, 'removeFromCalendar']);
    });

    // Availability Management Routes - Role-Based Access Control

    // Student Availability Management - Students have full CRUD on own availability
    Route::middleware(['role:student'])->group(function () {
        Route::get('/my-availability', [AvailabilityController::class, 'myAvailability']);
        Route::post('/my-availability', [AvailabilityController::class, 'store']);
        Route::put('/my-availability/{availability}', [AvailabilityController::class, 'update'])
            ->middleware('can:update,availability');
        Route::delete('/my-availability/{availability}', [AvailabilityController::class, 'destroy'])
            ->middleware('can:delete,availability');
        Route::post('/my-availability/bulk', [AvailabilityController::class, 'bulkStore']);
        Route::get('/my-availability/schedule', [AvailabilityController::class, 'schedule']);
    });

    // Coordinator Availability Management - Coordinators have full CRUD access
    Route::middleware(['role:coordinator', 'throttle:sensitive'])->group(function () {
        Route::apiResource('availability', AvailabilityController::class);
        Route::prefix('availability')->group(function () {
            Route::get('/schedule', [AvailabilityController::class, 'schedule']);
            Route::post('/bulk', [AvailabilityController::class, 'bulkStore']);
        });
    });

    // View Availability - Supervisor, Coordinator (Read-only access)
    Route::middleware(['role:supervisor,coordinator'])->group(function () {
        Route::get('/availability', [AvailabilityController::class, 'index']);
        Route::get('/availability/{availability}', [AvailabilityController::class, 'show']);
        Route::get('/availability/schedule', [AvailabilityController::class, 'schedule']);
    });

    // User can view and edit own profile
    Route::get('/profile', [AuthController::class, 'me']);
    Route::put('/profile', function (Request $request) {
        if (!Auth::check()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        /** @var User $user */
        $user = Auth::user();
        $user->update($request->only(['name', 'email', 'student_id', 'username']));
        return response()->json(['user' => new \App\Http\Resources\UserResource($user)]);
    });

    // Notification Routes
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
});

// Health Check Route
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'service' => 'Laravel API'
    ]);
});

Route::middleware('auth:sanctum')->group(function () {

    // Step 1: Get Google Auth URL
    Route::get('/google/auth-url', function (Request $request) {
        $client = new GoogleClient();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect'));
        $client->addScope(GoogleCalendar::CALENDAR);
        $client->setAccessType('offline');
        $client->setPrompt('consent');

        // Generate state
        $state = Str::random(40);
        // Store state -> user_id in cache for 5 minutes
        Cache::put('google_auth_state_' . $state, $request->user()->id, 300);
        \Illuminate\Support\Facades\Log::info('Google Auth URL: State generated: ' . $state . ' for User: ' . $request->user()->id);

        $client->setState($state);

        return response()->json(['url' => $client->createAuthUrl()]);
    });

    // Step 3: Create Google Calendar Event
    Route::post('/booking/google', function (Request $request) {
        $user = $request->user();

        $client = new GoogleClient();
        $client->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setAccessToken([
            'access_token' => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
        ]);

        // Refresh token if expired
        if ($client->isAccessTokenExpired()) {
            $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
            $user->google_access_token = $client->getAccessToken()['access_token'];
            $user->save();
        }

        $service = new GoogleCalendar($client);

        // Format dates to ensure seconds are included (required by Google API)
        // We use the string format Y-m-d\TH:i:s and let Google handle the timezone via the timeZone parameter
        $startDateTime = \Carbon\Carbon::parse($request->start)->format('Y-m-d\TH:i:s');
        $endDateTime = \Carbon\Carbon::parse($request->end)->format('Y-m-d\TH:i:s');

        $event = new GoogleCalendar\Event([
            'summary' => $request->title,
            'start' => ['dateTime' => $startDateTime, 'timeZone' => 'Asia/Bangkok'],
            'end' => ['dateTime' => $endDateTime, 'timeZone' => 'Asia/Bangkok'],
        ]);

        $service->events->insert('primary', $event);

        return response()->json(['success' => true]);
    });

});
