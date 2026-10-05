FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Copy project files to Apache root
COPY . /var/www/html/

# Expose default HTTP port
EXPOSE 80

CMD ["apache2-foreground"]
