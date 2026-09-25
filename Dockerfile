# ---- Etapa 1: build de Angular/Ionic ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production
# angular.json define outputPath.base = "www" y browser = "" (para que Capacitor use esa
# misma carpeta), así que el resultado queda directo en /app/www, no en /app/www/browser.

# ---- Etapa 2: servir el build estático con nginx en el puerto 80 ----
FROM nginx:1.27-alpine

# Plantilla con ${BACKEND_HOST}/${BACKEND_PORT}: la imagen base de nginx corre envsubst sobre
# los archivos en /etc/nginx/templates/*.template y escribe el resultado en conf.d al arrancar,
# así el backend se puede apuntar distinto en cada entorno sin reconstruir la imagen.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/www /usr/share/nginx/html

ENV BACKEND_HOST=backend
ENV BACKEND_PORT=3000

EXPOSE 80
