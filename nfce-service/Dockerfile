FROM php:8.2-apache

# Extensões necessárias para o sped-nfe
RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git libxml2-dev libssl-dev curl \
    && docker-php-ext-install zip soap \
    && rm -rf /var/lib/apt/lists/*

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Habilitar o provider legacy no OpenSSL 3 (necessário para ler certificados A1 PFX antigos)
RUN sed -i 's/default = default_sect/default = default_sect\nlegacy = legacy_sect/g' /etc/ssl/openssl.cnf \
    && sed -i 's/\[default_sect\]/\[default_sect\]\nactivate = 1/g' /etc/ssl/openssl.cnf \
    && echo "[legacy_sect]\nactivate = 1" >> /etc/ssl/openssl.cnf

# Document Root
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN a2enmod rewrite

# Copiar aplicação
WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --optimize-autoloader

# .htaccess para o Slim (front controller)
RUN echo '<IfModule mod_rewrite.c>\n\
    RewriteEngine On\n\
    RewriteCond %{REQUEST_FILENAME} !-f\n\
    RewriteCond %{REQUEST_FILENAME} !-d\n\
    RewriteRule ^ index.php [QSA,L]\n\
</IfModule>' > public/.htaccess

EXPOSE 80
