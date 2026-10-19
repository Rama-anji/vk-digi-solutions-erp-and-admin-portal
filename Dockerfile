FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY api ./api
COPY db.sql README.md ./
RUN npm run build

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install pdo_mysql curl \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite headers

ENV APACHE_DOCUMENT_ROOT=/var/www/html
WORKDIR /var/www/html

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/vkd-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/vkd-entrypoint && chmod +x /usr/local/bin/vkd-entrypoint

COPY . /var/www/html
COPY --from=frontend /build/dist /var/www/html/dist

RUN mkdir -p /var/www/html/dist /var/www/html/.storage/uploads /var/www/html/.storage/sessions \
    && chown -R www-data:www-data /var/www/html/.storage

CMD ["/usr/local/bin/vkd-entrypoint"]
