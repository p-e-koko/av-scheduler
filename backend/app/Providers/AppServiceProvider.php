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

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS if in production or if behind a secure proxy (Railway)
        if($this->app->environment('production') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) {
            URL::forceScheme('https');

            if (!$this->app->runningInConsole()) {
                $this->app['request']->server->set('HTTPS', 'on');
            }
        }

        VerifyEmail::createUrlUsing(function ($notifiable) {
            $frontendUrl = Config::get('app.frontend_url', 'https://pann.khazifire.com');

            $verifyUrl = URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            return $frontendUrl . '/auth/verify?url=' . urlencode($verifyUrl);
        });
    }
}
