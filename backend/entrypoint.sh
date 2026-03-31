#!/bin/sh
set -e

echo "🔄 Sincronizando schema Prisma (7bar)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

echo "🔄 Sincronizando schema Prisma (heart)..."
npx prisma db push --schema=prisma/heart.schema.prisma --accept-data-loss

echo "🌱 Populando dados iniciais (Seed)..."
# Usamos npx ts-node aqui pois os seeds costumam ser .ts na raiz da src
npx ts-node src/prisma/seed.ts
npx ts-node src/prisma/seed-tenant.ts

echo "✅ Schema sincronizado e dados carregados. Iniciando servidor..."
exec node dist/main
