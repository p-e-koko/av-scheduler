# -----------------------
# Stage 1: Build Next (frontend)
# -----------------------
FROM node:20-alpine AS node_builder
WORKDIR /app/frontend

# install deps
COPY frontend/package*.json ./
RUN npm ci

# copy source & build
COPY frontend ./

# Pass API URL during build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build static export (output: 'export' in next.config.ts)
RUN npm run build

# -----------------------
# Stage 2: Prepare Laravel (backend)
# -----------------------
FROM composer:2 AS composer_builder
WORKDIR /app/backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-scripts --no-interaction --no-progress

# copy the rest and run any composer post-install scripts
COPY backend ./
RUN composer run-script post-autoload-dump || true

# -----------------------
# Stage 3: Final runtime (nginx + php-fpm)
# -----------------------
FROM php:8.2-fpm-alpine

# Install extension installer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# install system deps for Laravel & Nginx & Supervisor
RUN apk add --no-cache \
    nginx \
    supervisor \
    bash \
    curl \
    file

# Install PHP extensions
RUN install-php-extensions \
    pdo_mysql \
    zip \
    intl

# create app dir
WORKDIR /var/www/html

# copy Laravel from composer_builder
COPY --from=composer_builder /app/backend /var/www/html

# copy built Next static export into nginx html root
# Note: Next.js 'output: export' creates an 'out' directory
COPY --from=node_builder /app/frontend/out /usr/share/nginx/html

# copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# copy supervisor config
COPY supervisord.conf /etc/supervisord.conf

# copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /usr/share/nginx/html

# expose port
EXPOSE 8080

# production bootstrap: set envs here or via Railway
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV PORT=8080

# Start supervisor via entrypoint
CMD ["/usr/local/bin/docker-entrypoint.sh"]
