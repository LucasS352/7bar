#!/bin/sh
set -e

echo "🔄 Sincronizando schema Prisma (7bar)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

echo "🔄 Sincronizando schema Prisma (heart)..."
npx prisma db push --schema=prisma/heart.schema.prisma --accept-data-loss

echo "✅ Schema sincronizado. Iniciando servidor..."
exec node dist/main
