import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { Prisma } from '@prisma/client';

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

      return await prisma.$transaction(async (tx) => {
        const existing = await tx.cashRegister.findFirst({
          where: { status: 'open' }
        });

        if (existing) {
          throw new BadRequestException(`Já existe um caixa aberto (${existing.operatorId === currentOpId ? 'por você' : 'por outro operador'}). Feche-o antes de abrir um novo.`);
        }

        return await tx.cashRegister.create({
          data: {
            operatorId: currentOpId,
            openingValue,
            status: 'open'
          }
        });
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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

    // Matemática Segura (Prisma.Decimal) para evitar perda de precisão flutuante (0.1 + 0.2 != 0.3)
    let totalDinheiro = new Prisma.Decimal(0);
    let totalPix = new Prisma.Decimal(0);
    let totalCredito = new Prisma.Decimal(0);
    let totalDebito = new Prisma.Decimal(0);

    sales.forEach(sale => {
      if (sale.status === 'cancelled') return;
      sale.payments.forEach(p => {
        const v = new Prisma.Decimal(p.value as any);
        if (p.method === 'dinheiro')      totalDinheiro = totalDinheiro.add(v);
        else if (p.method === 'pix')      totalPix      = totalPix.add(v);
        else if (p.method === 'credito')  totalCredito  = totalCredito.add(v);
        else if (p.method === 'debito')   totalDebito   = totalDebito.add(v);
      });
    });

    const movements = await prisma.cashMovement.findMany({
      where: { cashRegisterId: id },
      orderBy: { createdAt: 'desc' }
    });

    let totalSuprimentos = new Prisma.Decimal(0);
    let totalSangrias = new Prisma.Decimal(0);

    movements.forEach((m: any) => {
      const mv = new Prisma.Decimal(m.value as any);
      if (m.type === 'IN')  totalSuprimentos = totalSuprimentos.add(mv);
      if (m.type === 'OUT') totalSangrias    = totalSangrias.add(mv);
    });

    const openingValue = new Prisma.Decimal(register.openingValue as any);
    
    // Total Cartão = Crédito + Débito
    const totalCartao = totalCredito.add(totalDebito);
    // Total Vendas = Dinheiro + Pix + Cartão
    const totalVendas = totalDinheiro.add(totalPix).add(totalCartao);
    // Dinheiro Esperado na Gaveta = Abertura + Vendas(Dinheiro) + Suprimentos - Sangrias
    const expectedDinheiro = openingValue.add(totalDinheiro).add(totalSuprimentos).sub(totalSangrias);

    return {
      register,
      report: {
        totalDinheiro: totalDinheiro.toNumber(),
        totalPix: totalPix.toNumber(),
        totalCredito: totalCredito.toNumber(),
        totalDebito: totalDebito.toNumber(),
        totalCartao: totalCartao.toNumber(),
        totalVendas: totalVendas.toNumber(),
        totalSuprimentos: totalSuprimentos.toNumber(),
        totalSangrias: totalSangrias.toNumber(),
        countSales: sales.filter(s => s.status !== 'cancelled').length,
        expectedDinheiro: expectedDinheiro.toNumber(),
        salesDetails: sales,
        movements
      }
    };
  }
}
