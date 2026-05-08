import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class CashRegistersService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async openRegister(tenantId: string, databaseUrl: string, operatorId: string, openingValue: number) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

    const existing = await prisma.cashRegister.findFirst({
      where: { operatorId, status: 'open' }
    });

    if (existing) {
      throw new BadRequestException('Você já possui um caixa aberto.');
    }

    return prisma.cashRegister.create({
      data: {
        operatorId,
        openingValue,
        status: 'open'
      }
    });
  }

  async closeRegister(tenantId: string, databaseUrl: string, id: string, closingValue: number) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.cashRegister.update({
      where: { id },
      data: { closingValue, closingTime: new Date(), status: 'closed' }
    });
  }

  async getCurrentRegister(tenantId: string, databaseUrl: string, operatorId: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const current = await prisma.cashRegister.findFirst({
      where: { operatorId, status: 'open' }
    });

    if (current) {
      const today = new Date();
      const sameDay =
        current.openingTime.getDate() === today.getDate() &&
        current.openingTime.getMonth() === today.getMonth() &&
        current.openingTime.getFullYear() === today.getFullYear();

      if (!sameDay) {
        await prisma.cashRegister.update({
          where: { id: current.id },
          data: { status: 'closed', closingTime: new Date() }
        });
        return null;
      }
      return current;
    }
    return null;
  }

  async addMovement(tenantId: string, databaseUrl: string, registerId: string, type: 'IN' | 'OUT', value: number, reason?: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const register = await prisma.cashRegister.findUnique({ where: { id: registerId } });
    if (!register || register.status !== 'open') throw new BadRequestException('Caixa fechado ou inexistente');

    return prisma.cashMovement.create({
      data: { cashRegisterId: registerId, type, value, reason }
    });
  }

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.cashRegister.findMany({ orderBy: { openingTime: 'desc' } });
  }

  async getReport(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const register = await prisma.cashRegister.findUnique({ where: { id } });
    if (!register) throw new BadRequestException('Caixa não encontrado');

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: register.openingTime, lte: register.closingTime || new Date() } },
      include: { payments: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Decimal → number para cálculos (Prisma retorna Decimal objects)
    let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0;
    sales.forEach(sale => {
      sale.payments.forEach(p => {
        const v = Number(p.value);
        if (p.method === 'dinheiro')      totalDinheiro += v;
        else if (p.method === 'pix')      totalPix      += v;
        else if (p.method === 'credito')  totalCredito  += v;
        else if (p.method === 'debito')   totalDebito   += v;
      });
    });

    const movements = await prisma.cashMovement.findMany({
      where: { cashRegisterId: id },
      orderBy: { createdAt: 'desc' }
    });

    let totalSuprimentos = 0, totalSangrias = 0;
    movements.forEach((m: any) => {
      if (m.type === 'IN')  totalSuprimentos += Number(m.value);
      if (m.type === 'OUT') totalSangrias    += Number(m.value);
    });

    const openingValue = Number(register.openingValue);

    return {
      register,
      report: {
        totalDinheiro,
        totalPix,
        totalCredito,
        totalDebito,
        totalCartao:    totalCredito + totalDebito,
        totalVendas:    totalDinheiro + totalPix + totalCredito + totalDebito,
        totalSuprimentos,
        totalSangrias,
        countSales:     sales.length,
        expectedDinheiro: openingValue + totalDinheiro + totalSuprimentos - totalSangrias,
        salesDetails:   sales,
        movements
      }
    };
  }
}
