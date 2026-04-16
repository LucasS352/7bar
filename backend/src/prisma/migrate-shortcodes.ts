/**
 * Script: migrate-shortcodes.ts
 * Objetivo: Atribuir um shortCode incremental a todos os produtos que não possuem um.
 * Não altera preços nem estoque. Executar UMA VEZ.
 */
import * as dotenv from 'dotenv';
dotenv.config(); // Carrega o .env do backend

import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

async function migrateMissingShortCodes() {
  // Lê a URL do banco do tenant a partir das variáveis de ambiente
  const tenantDatabaseUrl = process.env.DATABASE_URL_TENANT;
  if (!tenantDatabaseUrl) {
    console.error('❌ DATABASE_URL_TENANT não está definida no ambiente!');
    process.exit(1);
  }

  // Importa o PrismaClient diretamente para o script standalone
  const { PrismaClient } = require('../../node_modules/@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: tenantDatabaseUrl } } });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco do tenant');

    // Busca todos os produtos que ainda não têm shortCode
    const productsWithoutCode = await prisma.product.findMany({
      where: { shortCode: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true }
    });

    if (productsWithoutCode.length === 0) {
      console.log('✅ Todos os produtos já possuem shortCode. Nada a fazer.');
      return;
    }

    console.log(`🔄 Encontrados ${productsWithoutCode.length} produtos sem shortCode. Iniciando migração...`);

    // Descobre o maior shortCode numérico existente para continuar a sequência
    const allProducts = await prisma.product.findMany({
      where: { shortCode: { not: null } },
      select: { shortCode: true }
    });

    let maxNum = 0;
    allProducts.forEach((p: any) => {
      const num = parseInt(p.shortCode || '0', 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    console.log(`📌 Maior shortCode existente: ${maxNum}. Próximo será: ${maxNum + 1}`);

    // Atribui shortCodes em sequência
    let counter = maxNum + 1;
    for (const product of productsWithoutCode) {
      const newCode = counter.toString();
      await prisma.product.update({
        where: { id: product.id },
        data: { shortCode: newCode }
      });
      console.log(`  → [${newCode}] ${product.name}`);
      counter++;
    }

    console.log(`\n🎉 Migração concluída! ${productsWithoutCode.length} produtos atualizados.`);
  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateMissingShortCodes();
