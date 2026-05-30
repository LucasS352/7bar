import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OperatorsService {
  constructor(
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantContext: TenantContextService
  ) {}

  private async getPrisma(tenantId: string) {
    const { databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async findAll(tenantId: string) {
    const prisma = await this.getPrisma(tenantId);
    return prisma.operator.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const prisma = await this.getPrisma(tenantId);
    const operator = await prisma.operator.findUnique({
      where: { id },
    });
    if (!operator) throw new NotFoundException('Operador não encontrado');
    return operator;
  }

  async create(tenantId: string, data: { name: string; pin: string }) {
    if (!data.pin || data.pin.length < 4 || data.pin.length > 6) {
      throw new BadRequestException('O PIN deve ter entre 4 e 6 dígitos.');
    }
    const prisma = await this.getPrisma(tenantId);
    const hashedPin = await bcrypt.hash(data.pin, 10);
    
    const op = await prisma.operator.create({
      data: {
        name: data.name,
        pin: hashedPin,
        active: true,
      },
    });
    
    // remove pin from return
    const { pin, ...result } = op;
    return result;
  }

  async update(tenantId: string, id: string, data: { name?: string; pin?: string; active?: boolean }) {
    const prisma = await this.getPrisma(tenantId);
    
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    
    if (data.pin) {
      if (data.pin.length < 4 || data.pin.length > 6) {
        throw new BadRequestException('O PIN deve ter entre 4 e 6 dígitos.');
      }
      updateData.pin = await bcrypt.hash(data.pin, 10);
    }

    try {
      const op = await prisma.operator.update({
        where: { id },
        data: updateData,
      });
      const { pin, ...result } = op;
      return result;
    } catch (e) {
      throw new NotFoundException('Operador não encontrado');
    }
  }

  async remove(tenantId: string, id: string) {
    const prisma = await this.getPrisma(tenantId);
    try {
      await prisma.operator.delete({
        where: { id },
      });
      return { success: true };
    } catch (e) {
      throw new NotFoundException('Operador não encontrado');
    }
  }

  async getConsumptions(tenantId: string) {
    const prisma = await this.getPrisma(tenantId);
    
    const operators = await prisma.operator.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        consumptions: {
          where: { settled: false },
          select: {
            sale: {
              select: {
                total: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return operators.map(op => {
      const pendingBalance = op.consumptions.reduce((sum, c) => sum + Number(c.sale.total), 0);
      return {
        id: op.id,
        name: op.name,
        pendingBalance,
      };
    });
  }

  async getOperatorConsumptionHistory(tenantId: string, operatorId: string) {
    const prisma = await this.getPrisma(tenantId);
    
    const consumptions = await prisma.operatorConsumption.findMany({
      where: { operatorId },
      include: {
        sale: {
          include: {
            items: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return consumptions.map(c => ({
      id: c.id,
      saleId: c.sale.id,
      total: Number(c.sale.total),
      settled: c.settled,
      settledAt: c.settledAt,
      createdAt: c.createdAt,
      items: c.sale.items.map(item => ({
        id: item.id,
        name: item.productName,
        quantity: Number(item.quantity),
        priceUnit: Number(item.priceUnit),
        subtotal: Number(item.subtotal)
      }))
    }));
  }

  async settleConsumptions(tenantId: string, operatorId: string) {
    const prisma = await this.getPrisma(tenantId);
    
    await prisma.operatorConsumption.updateMany({
      where: { operatorId, settled: false },
      data: {
        settled: true,
        settledAt: new Date()
      }
    });

    return { success: true };
  }

  async createManualConsumption(tenantId: string, data: { operatorId: string; productId: string; quantity: number }) {
    const prisma = await this.getPrisma(tenantId);
    
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: data.productId },
        include: { grupoTributacao: true }
      });
      if (!product) throw new NotFoundException('Produto não encontrado');
      
      const qty = Number(data.quantity);
      const priceSell = Number(product.priceSell);
      const subtotal = priceSell * qty;
      
      // Stock update
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: qty },
          salesCount: { increment: qty }
        }
      });
      
      // Create Sale
      const sale = await tx.sale.create({
        data: {
          subtotal: subtotal,
          discount: 0,
          total: subtotal,
          status: 'completed',
          items: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                quantity: qty,
                priceUnit: product.priceSell,
                subtotal: subtotal,
                ncm: product.ncm,
                cest: product.cest,
                origem: product.origem,
                csosn: product.grupoTributacao?.csosn,
                cstIcms: product.grupoTributacao?.cstIcms,
                aliqIcms: product.grupoTributacao?.aliqIcms ?? 0,
                cstPis: product.grupoTributacao?.cstPis ?? '99',
                aliqPis: product.grupoTributacao?.aliqPis ?? 0,
                cstCofins: product.grupoTributacao?.cstCofins ?? '99',
                aliqCofins: product.grupoTributacao?.aliqCofins ?? 0,
              }
            ]
          },
          payments: {
            create: [
              {
                tPag: '99',
                method: 'consumo_funcionario',
                value: subtotal,
                troco: 0
              }
            ]
          }
        }
      });
      
      // Create OperatorConsumption
      const consumption = await tx.operatorConsumption.create({
        data: {
          operatorId: data.operatorId,
          saleId: sale.id,
          settled: false,
        },
        include: {
          sale: {
            include: {
              items: true
            }
          }
        }
      });
      
      return consumption;
    });
  }

  async deleteConsumption(tenantId: string, id: string) {
    const prisma = await this.getPrisma(tenantId);
    
    const consumption = await prisma.operatorConsumption.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            items: true
          }
        }
      }
    });

    if (!consumption) throw new NotFoundException('Registro de consumo não encontrado');

    return prisma.$transaction(async (tx) => {
      for (const item of consumption.sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            salesCount: { decrement: Math.round(Number(item.quantity)) }
          }
        });
      }

      await tx.sale.delete({
        where: { id: consumption.saleId }
      });

      return { success: true };
    });
  }
}
