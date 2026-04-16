import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class SalesService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async checkout(tenantId: string, databaseUrl: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    
    // Transação: garante que só salva a venda se houver estoque
    return prisma.$transaction(async (tx) => {
      let total = 0;
      
      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(`Estoque insuficiente para o produto: ${product?.name ?? 'desconhecido'}`);
        }
        
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        total += item.priceUnit * item.quantity;
      }

      const sale = await tx.sale.create({
        data: {
          customerId: data.customerId || null,
          total: total - (data.discount || 0),
          discount: data.discount || 0,
          status: 'completed',
          // Campos fiscais NFC-e (opcionais) — types regenerados após prisma db push
          ...(data.customerCpf && { customerCpf: data.customerCpf }),
          ...(data.customerName && { customerName: data.customerName }),
          ...(data.nfeStatus && { nfeStatus: data.nfeStatus }),
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceUnit: item.priceUnit,
              subtotal: item.priceUnit * item.quantity
            }))
          },
          payments: {
            create: data.payments.map((pay: any) => ({
              method: pay.method,
              value: pay.value
            }))
          }
        } as any,
        include: { items: true, payments: true }
      });

      return sale;
    });
  }

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.sale.findMany({
      include: { 
        payments: true,
        items: { include: { product: true } },
        customer: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTodaySales(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.sale.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: { 
        payments: true,
        items: { include: { product: true } },
        customer: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
