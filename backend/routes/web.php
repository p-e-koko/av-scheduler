<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware('auth')->group(function () {

    // Step 1: Redirect to Google OAuth
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

    // Step 2: Google OAuth Callback
    Route::get('/google/callback', function (Request $request) {
        $client = new GoogleClient();
        $client->setHttpClient(new \GuzzleHttp\Client(['verify' => false]));
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setRedirectUri(config('services.google.redirect'));

        $token = $client->fetchAccessTokenWithAuthCode($request->code);

        $user = $request->user();
        $user->google_access_token = $token['access_token'];
        $user->google_refresh_token = $token['refresh_token'] ?? $user->google_refresh_token;
        $user->google_token_expires_at = now()->addSeconds($token['expires_in']);
        $user->save();

        return redirect('http://localhost:3000/dashboard');
    });

});

