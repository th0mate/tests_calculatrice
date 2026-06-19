FROM php:8.2-cli

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libonig-dev \
    && docker-php-ext-install mbstring \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . .
RUN composer install --no-interaction --no-progress

RUN vendor/bin/phpunit

ENV PORT=3001
EXPOSE 3001
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT} -t public public/index.php"]
