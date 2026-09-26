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

# Se mantiene como "template" (aunque hoy no tenga ninguna variable ${...} que sustituir) para no
# tener que tocar el Dockerfile si en el futuro nginx necesita volver a generar algo dinámico.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/www /usr/share/nginx/html

EXPOSE 80
