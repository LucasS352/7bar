import { Prisma } from '@prisma/client';

/** Ordem comum entre lançamento e checkout, incluindo ingredientes de compostos. */
export async function lockProducts(tx: Prisma.TransactionClient, productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))].sort();
  if (uniqueIds.length === 0) return;
  if (uniqueIds.length === 1) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM products WHERE id = ${uniqueIds[0]} FOR UPDATE`);
    return;
  }
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(uniqueIds)}) ORDER BY id ASC FOR UPDATE`,
  );
}
