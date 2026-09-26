# ---- Etapa 1: build de Angular/Ionic ----
# Node 22, no 20: @capacitor/cli exige Node >=22 y con 20 el build funciona pero deja un warning
# (EBADENGINE) en cada build.
FROM node:22-alpine AS build
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
