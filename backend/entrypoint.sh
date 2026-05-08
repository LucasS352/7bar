#!/bin/sh
set -e

echo "🔄 Sincronizando schema Prisma (tenant)..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

echo "🔄 Sincronizando schema Prisma (heart)..."
npx prisma db push --schema=prisma/heart.schema.prisma --accept-data-loss

echo "🌱 Verificando se banco precisa de dados iniciais..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('./prisma/generated/heart-client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "📦 Banco vazio! Rodando seed inicial..."
  node dist/prisma/seed.js
  echo "✅ Seed concluído!"
else
  echo "✅ Banco já populado ($USER_COUNT usuários). Seed ignorado."
fi

echo "🚀 Iniciando servidor na porta ${PORT:-3520}..."
exec node dist/main
