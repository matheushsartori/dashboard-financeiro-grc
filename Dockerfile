# Stage 1: Build
FROM node:20-alpine AS builder

# Instalar pnpm globalmente
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@10.4.1

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/dist/drizzle ./dist/drizzle
# Copiar script de migrations
COPY apply-migrations-pg.mjs ./

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3010

# Variável de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3010

# Healthcheck (porta padrão 3010, pode ser sobrescrita via env)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || '3010'; require('http').get(`http://localhost:${port}/api/trpc`, (r) => {process.exit(r.statusCode === 404 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]

