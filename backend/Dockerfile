# syntax=docker/dockerfile:1

###############################################
# Stage 1: build (compila TypeScript -> dist) #
###############################################
FROM node:22-slim AS build
WORKDIR /app

# Instala deps com cache de camada (copia manifestos primeiro).
COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies, mantendo apenas runtime deps em node_modules.
RUN npm prune --omit=dev

###############################################
# Stage 2: runtime (node slim, non-root)      #
###############################################
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Usuario non-root (imagem node ja traz o usuario "node").
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

# Healthcheck do container (alinhado a rota /health da aplicacao).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
