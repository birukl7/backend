# syntax=docker/dockerfile:1.7

FROM php:8.3-apache-bookworm

WORKDIR /var/www/html

# System deps + PHP extensions needed by Laravel and SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    curl \
    ca-certificates \
    gnupg \
    sqlite3 \
    libsqlite3-dev \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo pdo_sqlite mbstring zip gd opcache \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Composer binary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Apache should serve Laravel's public directory
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copy app files
COPY . .

# Install PHP dependencies (required before Vite/Wayfinder generation)
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist \
    && php artisan package:discover --ansi || true

# Install JS deps + build assets (Wayfinder needs php/artisan available)
RUN npm ci \
    && npm run build

# Runtime permissions
RUN mkdir -p storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

# Runtime entrypoint for Render (dynamic PORT + SQLite bootstrap + migrate)
RUN cat > /usr/local/bin/render-entrypoint.sh <<'EOF' && chmod +x /usr/local/bin/render-entrypoint.sh
#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-10000}"

# Render requires binding to the provided dynamic port.
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \\*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# SQLite bootstrap (recommended Render disk mount: /var/data)
if [[ "${DB_CONNECTION:-}" == "sqlite" ]]; then
  DB_PATH="${DB_DATABASE:-/var/data/database.sqlite}"
  mkdir -p "$(dirname "${DB_PATH}")"
  touch "${DB_PATH}"
  chmod 664 "${DB_PATH}" || true
fi

# Laravel prep
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan migrate --force || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

exec apache2-foreground
EOF

EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/render-entrypoint.sh"]
