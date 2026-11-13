<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind SafeMailChannel so notification email failures don't crash the app
        $this->app->bind(
            \Illuminate\Notifications\Channels\MailChannel::class,
            \App\Channels\SafeMailChannel::class
        );

        // Override Resend Client to disable SSL verification (Fix for local dev)
        if ($this->app->environment('local')) {
            $this->app->singleton(\Resend\Contracts\Client::class, static function () {
                $apiKey = config('resend.api_key') ?? config('services.resend.key');
                
                if (is_string($apiKey)) {
                    $apiKey = trim($apiKey);
                }
                
                // Create a Guzzle client that ignores SSL errors
                $client = new \GuzzleHttp\Client(['verify' => false]);
                
                // Manually build the Transporter components
                $baseUri = \Resend\ValueObjects\Transporter\BaseUri::from('api.resend.com');
                $headers = \Resend\ValueObjects\Transporter\Headers::withAuthorization(
                    \Resend\ValueObjects\ApiKey::from($apiKey)
                );
                
                $transporter = new \Resend\Transporters\HttpTransporter($client, $baseUri, $headers);
                
                return new \Resend\Client($transporter);
            });
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Extend notification 'mail' channel to use SafeMailChannel
        Notification::extend('mail', function ($app) {
            return $app->make(\App\Channels\SafeMailChannel::class);
        });

        // Register Socialite Provider
        Event::listen(function (\SocialiteProviders\Manager\SocialiteWasCalled $event) {
            $event->extendSocialite('microsoft', \SocialiteProviders\Azure\Provider::class);
        });

        // Force HTTPS in production (Essential for Socialite call_back generation)
        if($this->app->environment('production') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) {
            URL::forceScheme('https');
        }

        // Use default Laravel verification URL generation (Points to Backend directly)
        // VerifyEmail::createUrlUsing(function ($notifiable) { ... });
    }
}
