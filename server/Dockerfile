# BUCA SLUG - servizio della classifica generale (solo API, il gioco sta su GitHub Pages).
# Immagine ufficiale PHP con Apache, versione fissata: si aggiorna a mano cambiando il tag e ricostruendo.
FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod headers \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && rm -rf /var/www/html/*

COPY php-bucaslug.ini $PHP_INI_DIR/conf.d/zz-bucaslug.ini
COPY apache-bucaslug.conf /etc/apache2/conf-enabled/zz-bucaslug.conf
# il codice si monta in sola lettura dal NAS (vedi docker-compose.yml): niente COPY del codice
