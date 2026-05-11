import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class CashRegistersService {
  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService
  ) {}

  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async openRegister(openingValue: number, operatorId?: string) {
    try {
      const { userId } = this.tenantContext.get();
      const prisma = await this.getPrisma();

      // Se não vier operatorId do frontend, tenta usar o userId do token (fallback)
      const currentOpId = operatorId || userId;

      const existing = await prisma.cashRegister.findFirst({
        where: { status: 'open' }
      });

      if (existing) {
        throw new BadRequestException(`Já existe um caixa aberto (${existing.operatorId === currentOpId ? 'por você' : 'por outro operador'}). Feche-o antes de abrir um novo.`);
      }

      return await prisma.cashRegister.create({
        data: {
          operatorId: currentOpId,
          openingValue,
          status: 'open'
        }
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Erro no banco: ${error.message}`);
    }
  }

  async closeRegister(id: string, closingValue: number) {
    const prisma = await this.getPrisma();
    return prisma.cashRegister.update({
      where: { id },
      data: { closingValue, closingTime: new Date(), status: 'closed' }
    });
  }

  async getCurrentRegister() {
    const prisma = await this.getPrisma();
    const current = await prisma.cashRegister.findFirst({
      where: { status: 'open' }
    });

    if (current) {
      return current;
    }
    return null;
  }

  async addMovement(registerId: string, type: 'IN' | 'OUT', value: number, reason?: string) {
    const prisma = await this.getPrisma();
    const register = await prisma.cashRegister.findUnique({ where: { id: registerId } });
    if (!register || register.status !== 'open') throw new BadRequestException('Caixa fechado ou inexistente');

    return prisma.cashMovement.create({
      data: { cashRegisterId: registerId, type, value, reason }
    });
  }

  async findAll() {
    const prisma = await this.getPrisma();
    return prisma.cashRegister.findMany({ orderBy: { openingTime: 'desc' } });
  }

  async getReport(id: string) {
    const prisma = await this.getPrisma();
    const register = await prisma.cashRegister.findUnique({ where: { id } });
    if (!register) throw new BadRequestException('Caixa não encontrado');

    const sales = await prisma.sale.findMany({
      where: { cashRegisterId: id },
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
