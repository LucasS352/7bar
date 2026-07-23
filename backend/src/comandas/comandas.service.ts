import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class ComandasService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getPrisma() {
    return this.tenantContext.getPrisma();
  }

  async findAll(status: string = 'open') {
    const prisma = await this.getPrisma();
    const whereClause: any = {};
    if (status !== 'all') {
      whereClause.status = status;
    }

    const comandas = await (prisma as any).comanda.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                priceSell: true,
                unit: true,
                barcode: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return comandas;
  }

  async findOne(id: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        sale: true,
      },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    return comanda;
  }

  async create(data: { number: string; customerName?: string; notes?: string }) {
    const prisma = await this.getPrisma();

    if (!data.number || data.number.trim() === '') {
      throw new BadRequestException('O número ou identificador da comanda é obrigatório.');
    }

    // Verificar se já existe uma comanda aberta com o mesmo número
    const existingOpen = await (prisma as any).comanda.findFirst({
      where: {
        number: data.number.trim(),
        status: 'open',
      },
    });

    if (existingOpen) {
      throw new BadRequestException(`Já existe uma comanda/mesa aberta com a identificação "${data.number}".`);
    }

    const comanda = await (prisma as any).comanda.create({
      data: {
        number: data.number.trim(),
        customerName: data.customerName?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'open',
        total: 0,
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return comanda;
  }

  async addItems(
    comandaId: string,
    items: Array<{ productId: string; quantity: number; unitPrice?: number; notes?: string }>,
  ) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    if (comanda.status !== 'open') {
      throw new BadRequestException('Não é possível adicionar itens a uma comanda já fechada ou cancelada.');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Nenhum item fornecido para lançamento.');
    }

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Produto ID ${item.productId} não encontrado.`);
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.priceSell);
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));

      await (prisma as any).comandaItem.create({
        data: {
          comandaId,
          productId: item.productId,
          quantity,
          unitPrice,
          totalPrice,
          notes: item.notes || null,
        },
      });
    }

    // Recalcular total da comanda
    await this.recalculateTotal(comandaId);

    return this.findOne(comandaId);
  }

  async removeItem(comandaId: string, itemId: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda || comanda.status !== 'open') {
      throw new BadRequestException('Comanda inválida ou já encerrada.');
    }

    await (prisma as any).comandaItem.delete({
      where: { id: itemId },
    });

    await this.recalculateTotal(comandaId);
    return this.findOne(comandaId);
  }

  async closeComanda(comandaId: string, saleId?: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    const updated = await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: {
        status: 'closed',
        saleId: saleId || null,
      },
    });

    return updated;
  }

  async cancelComanda(comandaId: string) {
    const prisma = await this.getPrisma();
    const updated = await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: {
        status: 'cancelled',
      },
    });
    return updated;
  }

  private async recalculateTotal(comandaId: string) {
    const prisma = await this.getPrisma();
    const items = await (prisma as any).comandaItem.findMany({
      where: { comandaId },
    });

    const newTotal = items.reduce((acc: number, item: any) => acc + Number(item.totalPrice), 0);

    await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: {
        total: Number(newTotal.toFixed(2)),
      },
    });
  }
}
