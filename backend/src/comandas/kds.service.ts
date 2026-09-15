import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { assertKdsTransition } from './kds.rules';

@Injectable()
export class KdsService {
  constructor(
    private readonly heart: HeartPrismaService,
    private readonly manager: TenantConnectionManager,
    private readonly context: TenantContextService,
  ) {}

  async enabled() {
    const tenant = await this.heart.tenant.findUnique({
      where: { id: this.context.get().tenantId },
      select: { modulos: true },
    });
    try {
      const modules =
        typeof tenant?.modulos === 'string'
          ? JSON.parse(tenant.modulos)
          : tenant?.modulos;
      return modules?.kds === true;
    } catch {
      return false;
    }
  }

  private async client() {
    if (!(await this.enabled()))
      throw new ForbiddenException('KDS não está ativo para esta loja.');
    const { tenantId, databaseUrl } = this.context.get();
    return this.manager.getTenantClient(tenantId, databaseUrl);
  }

  async tickets() {
    const prisma = await this.client();
    return (prisma as any).comandaItem.findMany({
      where: {
        kdsStatus: { in: ['PENDING', 'PREPARING', 'READY'] },
        comanda: { status: { in: ['open', 'waiting_payment'] } },
      },
      include: {
        product: { select: { name: true, preparationIngredients: true } },
        modifiers: true,
        createdBy: { select: { name: true } },
        comanda: {
          select: {
            id: true,
            number: true,
            responsibleWaiter: { select: { name: true } },
          },
        },
      },
      orderBy: [{ kdsSentAt: 'asc' }, { id: 'asc' }],
    });
  }

  async update(itemIds: string[], status: string) {
    if (
      !Array.isArray(itemIds) ||
      !itemIds.length ||
      itemIds.length > 100 ||
      itemIds.some((id) => typeof id !== 'string') ||
      new Set(itemIds).size !== itemIds.length
    ) {
      throw new BadRequestException('Informe de 1 a 100 itens distintos.');
    }
    if (!['PREPARING', 'READY', 'DELIVERED'].includes(status))
      throw new BadRequestException('Status KDS inválido.');
    const prisma = await this.client();
    return (prisma as any).$transaction(
      async (tx: any) => {
        const items = await tx.comandaItem.findMany({
          where: { id: { in: itemIds } },
          include: { comanda: true },
        });
        if (items.length !== itemIds.length)
          throw new BadRequestException('Pedido não encontrado.');
        // Ordem estável evita deadlocks entre telas que enviam lotes diferentes.
        for (const comandaId of [
          ...new Set<string>(items.map((item: any) => item.comandaId)),
        ].sort()) {
          const rows = await tx.$queryRaw(
            Prisma.sql`SELECT id, status FROM comandas WHERE id = ${comandaId} FOR UPDATE`,
          );
          if (
            !rows.length ||
            !['open', 'waiting_payment'].includes(rows[0].status)
          )
            throw new ConflictException('Comanda encerrada.');
        }
        for (const item of items) {
          if (!['open', 'waiting_payment'].includes(item.comanda.status))
            throw new ConflictException('Comanda encerrada.');
          assertKdsTransition(item.kdsStatus, status);
          if (
            status === 'DELIVERED' &&
            !item.serveImmediately &&
            item.kdsDestination !== 'KITCHEN'
          ) {
            const waiting = await tx.comandaItem.count({
              where: {
                comandaId: item.comandaId,
                kdsDestination: 'KITCHEN',
                kdsStatus: { in: ['PENDING', 'PREPARING'] },
              },
            });
            if (waiting)
              throw new BadRequestException(
                'Este item deve sair junto com a comida. Aguarde a cozinha ficar pronta.',
              );
          }
          const result = await tx.comandaItem.updateMany({
            where: { id: item.id, kdsStatus: item.kdsStatus },
            data: {
              kdsStatus: status,
              ...(status === 'READY' ? { kdsReadyAt: new Date() } : {}),
              ...(status === 'DELIVERED' ? { kdsDeliveredAt: new Date() } : {}),
            },
          });
          if (result.count !== 1)
            throw new ConflictException(
              'Pedido atualizado em outra tela. Recarregue a fila.',
            );
        }
        return { updated: items.length };
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
