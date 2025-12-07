# =========================
# Stage 1: Build Node assets (Next.js + Laravel Vite/Mix)
# =========================
FROM node:20-alpine3.19 AS node_builder
WORKDIR /app

# Install deps for frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# Laravel assets (only if using Vite/Mix; ignore errors if no JS build needed)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci || true
COPY backend ./backend
RUN cd backend && npm run build || true


# =========================
# Stage 2: Install PHP dependencies (Composer)
# =========================
FROM composer:2 AS composer_builder
WORKDIR /app
COPY backend ./backend
RUN cd backend && composer install --no-dev --optimize-autoloader


# =========================
# Stage 3: Final image = PHP-FPM + Nginx + Supervisor + Node Runtime
# =========================
FROM php:8.2-fpm-alpine

WORKDIR /var/www/html

# Install required packages
RUN apk add --no-cache \
    nginx \
    supervisor \
    nodejs \
    npm \
    bash \
    curl \
    git \
    icu-dev \
    zlib-dev \
    libzip-dev \
    oniguruma-dev

# PHP extensions
# Build PHP extensions safely for Alpine
# Install required system packages
RUN apk add --no-cache \
    nginx \
    supervisor \
    nodejs \
    npm \
    bash \
    curl \
    git \
    icu-dev \
    zlib-dev \
    libzip-dev \
    oniguruma-dev \
    autoconf \
    make \
    g++ \
    libtool

# Install PHP extensions
RUN docker-php-ext-configure intl \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        mbstring \
        zip \
        intl


# --- Copy Laravel code ---
COPY --from=composer_builder /app/backend ./

# --- Copy Next.js production build ---
RUN mkdir -p /var/www/html/frontend
COPY --from=node_builder /app/frontend/.next /var/www/html/frontend/.next
COPY --from=node_builder /app/frontend/public /var/www/html/frontend/public
COPY --from=node_builder /app/frontend/node_modules /var/www/html/frontend/node_modules
COPY --from=node_builder /app/frontend/package.json /var/www/html/frontend/

# --- Copy Laravel built assets ---
COPY --from=node_builder /app/backend/public /var/www/html/public

# --- Copy configs ---
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Permissions
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache || true

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
