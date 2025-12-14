<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;

Route::get('/', function () {
    return view('welcome');
});

// Named login route to prevent 500 error if auth fails
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated. Please login via API.'], 401);
})->name('login');

// Step 2: Google OAuth Callback (No auth middleware needed, we use state)
Route::get('/google/callback', function (Request $request) {
    $state = $request->input('state');

    if (!$state) {
        return redirect('http://localhost:3000/dashboard?error=missing_state');
    }

    $userId = Cache::pull('google_auth_state_' . $state);
    \Illuminate\Support\Facades\Log::info('Google Callback: State: ' . $state . ' UserID: ' . $userId);

    if (!$userId) {
        return redirect('http://localhost:3000/dashboard?error=invalid_state_or_timeout');
    }

    $user = \App\Models\User::find($userId);
    if (!$user) {
        \Illuminate\Support\Facades\Log::error('Google Callback: User not found for ID: ' . $userId);
        return redirect('http://localhost:3000/dashboard?error=user_not_found');
    }

    $client = new GoogleClient();
    $client->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
    $client->setClientId(config('services.google.client_id'));
    $client->setClientSecret(config('services.google.client_secret'));
    $client->setRedirectUri(config('services.google.redirect'));

    try {
        $token = $client->fetchAccessTokenWithAuthCode($request->code);
        \Illuminate\Support\Facades\Log::info('Google Callback: Token received', ['token_keys' => array_keys($token)]);

        if (isset($token['error'])) {
             return redirect('http://localhost:3000/dashboard?error=' . $token['error']);
        }

        $updateData = [
            'google_access_token' => $token['access_token'],
            'google_token_expires_at' => now()->addSeconds($token['expires_in']),
        ];

        if (isset($token['refresh_token'])) {
            $updateData['google_refresh_token'] = $token['refresh_token'];
        }

        $user->update($updateData);
        
        \Illuminate\Support\Facades\Log::info('Google Callback: User saved. Token set for user: ' . $user->id);

        return redirect('http://localhost:3000/dashboard?success=google_connected');
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Google Callback Error: ' . $e->getMessage());
        return redirect('http://localhost:3000/dashboard?error=' . urlencode($e->getMessage()));
    }
});

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

