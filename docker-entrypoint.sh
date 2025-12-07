#!/bin/bash
set -e

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Clear caches to ensure config updates take effect
php artisan config:clear
php artisan cache:clear

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
