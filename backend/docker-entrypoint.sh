#!/bin/bash
set -e

# Create a temporary .env file from environment variables if it doesn't exist
# This is required for `php artisan key:generate` to work if it tries to write to the file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
    echo "APP_KEY=" >> .env
fi

# Configure Sanctum domains if on Railway
if [ ! -z "$RAILWAY_PUBLIC_DOMAIN" ]; then
    echo "Configuring Sanctum for domain: $RAILWAY_PUBLIC_DOMAIN"
    # Ensure we don't overwrite if manually set
    if [ -z "$SANCTUM_STATEFUL_DOMAINS" ]; then
        export SANCTUM_STATEFUL_DOMAINS="$RAILWAY_PUBLIC_DOMAIN"
    fi
    if [ -z "$SESSION_DOMAIN" ]; then
        export SESSION_DOMAIN="$RAILWAY_PUBLIC_DOMAIN"
    fi
    if [ -z "$APP_URL" ]; then
        export APP_URL="https://$RAILWAY_PUBLIC_DOMAIN"
    fi
fi

# Clear caches before migration to avoid stale config issues
echo "Clearing caches..."
CACHE_STORE=file CACHE_DRIVER=file php artisan optimize:clear

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Run seeders (safe to run multiple times now)
echo "Running seeders..."
php artisan db:seed --force

# Re-cache configuration for performance
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Fix permissions again because artisan commands run as root
echo "Fixing storage permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
