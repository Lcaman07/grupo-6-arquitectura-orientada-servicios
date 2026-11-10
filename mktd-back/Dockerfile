# =====================================================================
#  MarketData API (back) - imagen liviana de producción
#  docker build -t marketdata-api .      (o: docker compose up -d --build)
# =====================================================================
FROM node:22-alpine

ENV NODE_ENV=production \
    TZ=America/Lima \
    APP_PROFILE=docker \
    SERVER_PORT=8081 \
    LOG_DIR=/app/logs \
    UPLOAD_DIR=/app/uploads

RUN apk add --no-cache tzdata

WORKDIR /app

# primero solo las dependencias: si no cambian, Docker reutiliza esta capa
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY src ./src

# usuario sin privilegios (la imagen node ya trae "node")
RUN mkdir -p /app/logs /app/uploads && chown -R node:node /app/logs /app/uploads
USER node

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${SERVER_PORT}${CONTEXT_PATH:-/marketdata-api}/actuator/health" || exit 1

CMD ["node", "src/server.js"]
