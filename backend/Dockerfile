FROM node:20-alpine AS builder

WORKDIR /app

# Dependências nativas para bcrypt e Prisma
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm ci

COPY . .

# Gera ambos os Prisma Clients antes do build
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx prisma generate --schema=prisma/heart.schema.prisma

RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

# Prisma Clients
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Código compilado
COPY --from=builder /app/dist ./dist

# Schemas Prisma (para db push no entrypoint)
COPY prisma ./prisma

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3520

ENTRYPOINT ["./entrypoint.sh"]
