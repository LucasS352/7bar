import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class PayablesService {
  constructor(
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async createPayable(data: any) {
    const prisma = await this.getPrisma();
    const { id, createdAt, updatedAt, supplier, paidAt, ...createData } = data;
    
    // Ensure decimal casting
    if (createData.amount) {
      createData.amount = Number(createData.amount);
    }
    
    // Ensure date casting
    if (createData.dueDate) {
      createData.dueDate = new Date(createData.dueDate);
    }

    if (createData.status === 'PAID' && !data.paidAt) {
      createData.paidAt = new Date();
    }

    return prisma.payable.create({
      data: createData,
    });
  }

  async getPayables(month?: string, year?: string) {
    const prisma = await this.getPrisma();
    
    const where: any = {};
    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      where.dueDate = {
        gte: start,
        lte: end,
      };
    }

    return prisma.payable.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        supplier: true,
      },
    });
  }

  async getPayablesDashboard(month?: string, year?: string) {
    const prisma = await this.getPrisma();
    
    const d = new Date();
    const m = month ? parseInt(month) - 1 : d.getMonth();
    const y = year ? parseInt(year) : d.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const payables = await prisma.payable.findMany({
      where: {
        dueDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalFixed = payables.filter(p => p.type === 'FIXED').reduce((acc, p) => acc + Number(p.amount), 0);
    const totalVariable = payables.filter(p => p.type === 'VARIABLE').reduce((acc, p) => acc + Number(p.amount), 0);
    const paidFixed = payables.filter(p => p.type === 'FIXED' && p.status === 'PAID').reduce((acc, p) => acc + Number(p.amount), 0);
    const paidVariable = payables.filter(p => p.type === 'VARIABLE' && p.status === 'PAID').reduce((acc, p) => acc + Number(p.amount), 0);
    const totalToPay = totalFixed + totalVariable;
    const totalPaid = paidFixed + paidVariable;

    // Get current month sales to calculate Real Profit (Sales - Payables - Purchases?)
    // Basic real profit = sales total - payables
    const sales = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: 'completed',
      },
      _sum: {
        total: true,
      }
    });

    const totalSales = Number(sales._sum.total || 0);
    const realProfit = totalSales - totalToPay;
    const breakEvenPoint = totalToPay; // To pay bills we need at least totalToPay in gross margin, wait, just conceptually "how much we need to sell". Let's say we need to sell totalToPay.
    const remainingToBreakEven = Math.max(0, totalToPay - totalSales);

    return {
      totalFixed,
      totalVariable,
      paidFixed,
      paidVariable,
      totalToPay,
      totalPaid,
      totalSales,
      realProfit,
      breakEvenPoint,
      remainingToBreakEven
    };
  }

  async getPayableById(payableId: string) {
    const prisma = await this.getPrisma();
    const payable = await prisma.payable.findUnique({
      where: { id: payableId },
      include: {
        supplier: true,
      },
    });

    if (!payable) throw new NotFoundException('Conta não encontrada.');
    return payable;
  }

  async updatePayable(payableId: string, data: any) {
    const prisma = await this.getPrisma();
    const { id, createdAt, updatedAt, supplier, paidAt, ...updateData } = data;
    
    if (updateData.amount) {
      updateData.amount = Number(updateData.amount);
    }
    
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    if (updateData.status === 'PAID' && !data.paidAt) {
      updateData.paidAt = new Date();
    } else if (updateData.status === 'PENDING') {
      updateData.paidAt = null;
    }

    return prisma.payable.update({
      where: { id: payableId },
      data: updateData,
    });
  }

  async deletePayable(payableId: string) {
    const prisma = await this.getPrisma();
    return prisma.payable.delete({
      where: { id: payableId },
    });
  }

  async payPayable(payableId: string) {
    const prisma = await this.getPrisma();
    
    const payable = await prisma.payable.findUnique({ where: { id: payableId }});
    if (!payable) throw new NotFoundException('Conta não encontrada.');
    if (payable.status === 'PAID') return payable; // Already paid

    const updated = await prisma.payable.update({
      where: { id: payableId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      }
    });

    // If it's recurring, automatically generate next month's payable
    if (payable.isRecurring) {
      const nextDueDate = new Date(payable.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      // Check if it already exists to avoid duplicates
      const exists = await prisma.payable.findFirst({
        where: {
          description: payable.description,
          dueDate: {
            gte: new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate(), 0, 0, 0),
            lte: new Date(nextDueDate.getFullYear(), nextDueDate.getMonth(), nextDueDate.getDate(), 23, 59, 59),
          }
        }
      });

      if (!exists) {
        await prisma.payable.create({
          data: {
            description: payable.description,
            amount: payable.amount,
            dueDate: nextDueDate,
            status: 'PENDING',
            type: payable.type,
            isRecurring: payable.isRecurring,
            category: payable.category,
            supplierId: payable.supplierId,
            notes: payable.notes,
          }
        });
      }
    }

    return updated;
  }
}
