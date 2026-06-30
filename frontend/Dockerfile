# syntax=docker/dockerfile:1

###############################################
# Stage 1: build (Vite -> estatico em /dist)  #
###############################################
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

###############################################
# Stage 2: runtime (nginx alpine, non-root)   #
###############################################
FROM nginx:1.27-alpine AS runtime

# Config de SPA + proxy /api.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Artefato estatico gerado pelo Vite.
COPY --from=build /app/dist /usr/share/nginx/html

# Roda o nginx como usuario non-root na porta 8080 (>1024).
# A imagem nginx:alpine ja traz o usuario "nginx".
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
