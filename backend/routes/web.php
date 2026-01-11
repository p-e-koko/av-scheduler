<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
/* use Google\Client as GoogleClient; */
/* use Google\Service\Calendar as GoogleCalendar; */
use App\Http\Controllers\Api\AuthController;
use Laravel\Socialite\Facades\Socialite;

Route::get('/', function () {
    return view('welcome');
});

// Named login route to prevent 500 error if auth fails
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated. Please login via API.'], 401);
})->name('login');

Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider']);
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);

// Step 2: Google OAuth Callback (No auth middleware needed, we use state)
/*
Route::get('/google/callback', function (Request $request) {
    // Deprecated Google Callback
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/dashboard?error=deprecated');
});
*/

Route::middleware('auth')->group(function () {
    // Legacy route - kept just in case, but not used by new flow
    Route::get('/google/login', function () {
        $client = new GoogleClient();
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect'));
        $client->addScope(GoogleCalendar::CALENDAR);
        $client->setAccessType('offline'); // for refresh token
        $client->setPrompt('consent');

        return redirect($client->createAuthUrl());
    });
});

use Resend\Laravel\Facades\Resend;

// Debug route for testing Resend email sending
Route::get('/debug/resend-fix', function (Request $request) {
    try {
        $to = $request->query('email');
        
        if (!$to) {
            return response()->json([
                'error' => 'Missing recipient email. Use ?email=your@email.com',
                'config' => [
                    'mail_mailer' => config('mail.default'),
                    'mail_from_address' => config('mail.from.address'),
                    'mail_from_name' => config('mail.from.name'),
                    'resend_key_check' => [
                        'exists' => !empty(config('services.resend.key')),
                        'length' => strlen(config('services.resend.key')),
                        'start' => substr(config('services.resend.key'), 0, 4) . '...',
                        'end' => '...' . substr(config('services.resend.key'), -4),
                    ],
                ]
            ], 400);
        }

        $results = [];

        // 1. Test via Resend SDK (Direct Facade)
        try {
            $sdkResult = Resend::emails()->send([
                'from' => config('mail.from.address'),
                'to' => $to,
                'subject' => 'Resend SDK Test: ' . now(),
                'html' => '<p>This is a test email sent directly via Resend SDK Facade.</p>',
            ]);
            
            $results['sdk_method'] = [
                'status' => 'success',
                'data' => $sdkResult->toArray()
            ];
        } catch (\Throwable $e) {
            $results['sdk_method'] = [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'class' => get_class($e)
            ];
        }

        // 2. Test via Laravel Mail Facade
        try {
            \Illuminate\Support\Facades\Mail::raw('This is a test email using Laravel Mail Facade.', function ($message) use ($to) {
                $message->to($to)
                        ->subject('Laravel Mail Facade Test: ' . now());
            });
            
            $results['laravel_mail_method'] = [
                'status' => 'success',
                'message' => 'Email queued/sent successfully via Mail facade.'
            ];
        } catch (\Throwable $e) {
            $results['laravel_mail_method'] = [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'class' => get_class($e)
            ];
        }

        return response()->json([
            'config' => [
                'mail_mailer' => config('mail.default'),
                'mail_from_address' => config('mail.from.address'),
                'resend_key_set' => !empty(config('services.resend.key')),
            ],
            'results' => $results
        ]);

    } catch (\Throwable $e) {
        return response()->json([
            'critical_error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});
