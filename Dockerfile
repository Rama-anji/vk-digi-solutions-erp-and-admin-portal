FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite headers

COPY package.json package-lock.json ./
RUN npm ci

ENV APACHE_DOCUMENT_ROOT=/var/www/html
WORKDIR /var/www/html

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/entrypoint.sh /usr/local/bin/vkd-entrypoint
RUN chmod +x /usr/local/bin/vkd-entrypoint

COPY . /var/www/html
RUN npm run build

RUN mkdir -p /var/www/html/dist /var/www/html/.storage/uploads /var/www/html/.storage/sessions \
    && chown -R www-data:www-data /var/www/html/.storage

CMD ["/usr/local/bin/vkd-entrypoint"]
