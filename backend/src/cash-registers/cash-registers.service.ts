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
          where: { status: 'open', operatorId: currentOpId }
        });

        if (existing) {
          throw new BadRequestException(`Você já possui um caixa aberto. Feche-o antes de abrir um novo.`);
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

  async closeRegister(id: string, closingValue: number | null) {
    const prisma = await this.getPrisma();
    return prisma.cashRegister.update({
      where: { id },
      data: { closingValue, closingTime: new Date(), status: 'closed' }
    });
  }

  async auditRegister(id: string, closingValue: number) {
    const prisma = await this.getPrisma();
    const register = await prisma.cashRegister.findUnique({ where: { id } });
    if (!register || register.status !== 'closed') {
      throw new BadRequestException('Caixa não encontrado ou não está fechado');
    }
    return prisma.cashRegister.update({
      where: { id },
      data: { closingValue }
    });
  }

  async getCurrentRegister(operatorId?: string) {
    const { userId } = this.tenantContext.get();
    const currentOpId = operatorId || userId;
    const prisma = await this.getPrisma();
    const current = await prisma.cashRegister.findFirst({
      where: { status: 'open', operatorId: currentOpId }
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
    const register = await prisma.cashRegister.findUnique({
      where: { id },
      include: { operator: { select: { id: true, name: true, isManager: true } } }
    });
    if (!register) throw new BadRequestException('Caixa não encontrado');

    const sales = await prisma.sale.findMany({
      where: { cashRegisterId: id, NOT: { source: 'ajuste_fiscal' } },
      include: { payments: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Matemática Segura (Prisma.Decimal) para evitar perda de precisão flutuante (0.1 + 0.2 != 0.3)
    let totalDinheiro = new Prisma.Decimal(0);
    let totalPix = new Prisma.Decimal(0);
    let totalCredito = new Prisma.Decimal(0);
    let totalDebito = new Prisma.Decimal(0);
    // Mapa para métodos customizados: { methodKey -> { label, total } }
    const customMethodTotals: Record<string, { label: string; total: Prisma.Decimal }> = {};

    sales.forEach(sale => {
      if (sale.status === 'cancelled' || sale.source === 'ajuste_fiscal') return;
      sale.payments.forEach((p: any) => {
        const v = new Prisma.Decimal(p.value as any);
        if (p.method === 'dinheiro')      totalDinheiro = totalDinheiro.add(v);
        else if (p.method === 'pix')      totalPix      = totalPix.add(v);
        else if (p.method === 'credito')  totalCredito  = totalCredito.add(v);
        else if (p.method === 'debito')   totalDebito   = totalDebito.add(v);
        else if (p.method !== 'consumo_funcionario') {
          // Método customizado: usa label salvo ou o próprio method como fallback
          const key = p.method;
          const labelName = p.label || p.method;
          if (!customMethodTotals[key]) {
            customMethodTotals[key] = { label: labelName, total: new Prisma.Decimal(0) };
          }
          customMethodTotals[key].total = customMethodTotals[key].total.add(v);
        }
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
    // Total Customizado (iFood, Ticket, etc.)
    let totalCustom = new Prisma.Decimal(0);
    Object.values(customMethodTotals).forEach(m => { totalCustom = totalCustom.add(m.total); });
    // Total Vendas = Dinheiro + Pix + Cartão + Custom
    const totalVendas = totalDinheiro.add(totalPix).add(totalCartao).add(totalCustom);
    // Dinheiro Esperado na Gaveta = Abertura + Vendas(Dinheiro) + Suprimentos - Sangrias
    const expectedDinheiro = openingValue.add(totalDinheiro).add(totalSuprimentos).sub(totalSangrias);

    // Serializa métodos customizados para JSON
    const customMethodsSummary = Object.entries(customMethodTotals).map(([key, val]) => ({
      method: key,
      label: val.label,
      total: val.total.toNumber(),
    }));

    return {
      register,
      report: {
        totalDinheiro: totalDinheiro.toNumber(),
        totalPix: totalPix.toNumber(),
        totalCredito: totalCredito.toNumber(),
        totalDebito: totalDebito.toNumber(),
        totalCartao: totalCartao.toNumber(),
        totalCustom: totalCustom.toNumber(),
        customMethods: customMethodsSummary,
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
