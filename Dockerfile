# -----------------------
# Stage 1: Build Dependencies
# -----------------------
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-scripts --no-interaction --no-progress --ignore-platform-reqs

# -----------------------
# Stage 2: Final Runtime
# -----------------------
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    bash \
    curl \
    libpng-dev \
    libzip-dev \
    zip \
    unzip

# Install PHP extensions
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
    pdo_mysql \
    pdo_pgsql \
    zip \
    gd \
    bcmath \
    intl \
    opcache

# Configure PHP
RUN echo "upload_max_filesize = 20M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 20M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "variables_order = EGPCS" >> /usr/local/etc/php/conf.d/variables_order.ini

# Configure Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Configure Supervisor
COPY supervisord.conf /etc/supervisord.conf

# Setup Working Directory
WORKDIR /var/www/html

# Copy Vendor
COPY --from=vendor /app/vendor /var/www/html/vendor

# Copy App Code
COPY backend /var/www/html

# Permissions
RUN chown -R www-data:www-data /var/www/html

# Expose Port
EXPOSE 8080

# Entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["/usr/local/bin/docker-entrypoint.sh"]
