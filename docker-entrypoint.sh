#!/bin/bash
set -e

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
php artisan optimize:clear

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

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
