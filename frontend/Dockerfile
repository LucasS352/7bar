FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build com variáveis de ambiente de produção
ARG NEXT_PUBLIC_API_URL=http://179.127.59.225:3520
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://179.127.59.225:3520

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3521

CMD ["serve", "-s", "dist", "-l", "3521"]
