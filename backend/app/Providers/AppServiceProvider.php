<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
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
        // Force HTTPS if in production or if behind a secure proxy (Railway)
        // Disabled for raw IP deployment to avoid connection refused errors
        /*
        if($this->app->environment('production') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) {
            URL::forceScheme('https');

            if (!$this->app->runningInConsole()) {
                $this->app['request']->server->set('HTTPS', 'on');
            }
        }
        */

        // Use default Laravel verification URL generation (Points to Backend directly)
        // VerifyEmail::createUrlUsing(function ($notifiable) { ... });
    }
}
