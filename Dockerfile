# ---- Étape 1 : build Angular ----
FROM node:20-alpine AS build

WORKDIR /app
# .npmrc porte legacy-peer-deps=true, indispensable à npm ci
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
# Le script "build" lance déjà ng build --configuration production
RUN npm run build

# ---- Étape 2 : image d'exécution Nginx ----
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# outputPath de angular.json : dist/vex (builder "browser" d'Angular 16,
# donc pas de sous-dossier "browser")
COPY --from=build /app/dist/vex /usr/share/nginx/html

EXPOSE 80
