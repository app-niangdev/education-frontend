# frontend/Dockerfile

# ---------- STAGE 1 : Build Angular ----------
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Adapter le nom du projet si angular.json en définit un autre que "frontend"
RUN npm run build -- --configuration=production

# ---------- STAGE 2 : Image finale Nginx ----------
FROM nginx:1.27-alpine AS app

# Nettoyage config par défaut + copie de notre config
RUN rm -rf /usr/share/nginx/html/* \
&& rm /etc/nginx/conf.d/default.conf

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Le dossier de sortie du build dépend de angular.json (outputPath)
# Par défaut Angular 17+ : dist/<project-name>/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
