import { Injectable } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class DashboardService {
  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService
  ) {}

  async getSummary(
    tenantId: string,
    startDate: string,
    endDate: string,
  ) {
    const { databaseUrl } = this.tenantContext.get();
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

    // ── Definir janelas de tempo ────────────────────────────────────────────
    const now = new Date();

    const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayStr = nowBr.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayStart = new Date(`${todayStr}T00:00:00-03:00`);
    const todayEnd   = new Date(`${todayStr}T23:59:59-03:00`);

    // Início da semana (segunda-feira)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

    // Semana anterior
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setMilliseconds(-1);

    // Início do mês
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Janela de período customizado do filtro (Ajustado para fuso -03:00) ──
    const periodStart = new Date(`${startDate}T00:00:00-03:00`);
    const periodEnd   = new Date(`${endDate}T23:59:59-03:00`);

    // ── 1. Caixa atual aberto ──────────────────────────────────────────────
    const openRegister = await prisma.cashRegister.findFirst({
      where: { status: 'open' },
      include: { operator: { select: { name: true } } },
      orderBy: { openingTime: 'desc' },
    });

    let currentRegisterRevenue = 0;
    if (openRegister) {
      const regSales = await prisma.sale.aggregate({
        where: { cashRegisterId: openRegister.id, NOT: { status: 'cancelled' } },
        _sum: { total: true },
      });
      currentRegisterRevenue = Number(regSales._sum.total ?? 0);
    }

    // ── 2. Faturamento de Hoje ─────────────────────────────────────────────
    const todayAgg = await prisma.sale.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, NOT: { status: 'cancelled' } },
      _sum: { total: true },
      _count: { id: true },
    });

    // ── 3. Faturamento da Semana ───────────────────────────────────────────
    const weekAgg = await prisma.sale.aggregate({
      where: { createdAt: { gte: weekStart, lte: todayEnd }, NOT: { status: 'cancelled' } },
      _sum: { total: true },
    });

    const prevWeekAgg = await prisma.sale.aggregate({
      where: { createdAt: { gte: prevWeekStart, lte: prevWeekEnd }, NOT: { status: 'cancelled' } },
      _sum: { total: true },
    });

    const weekRevenue = Number(weekAgg._sum.total ?? 0);
    const prevWeekRevenue = Number(prevWeekAgg._sum.total ?? 0);
    const vsLastWeek = prevWeekRevenue > 0
      ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : null;

    // ── 4. Faturamento do Mês ──────────────────────────────────────────────
    const monthAgg = await prisma.sale.aggregate({
      where: { createdAt: { gte: monthStart, lte: todayEnd }, NOT: { status: 'cancelled' } },
      _sum: { total: true },
    });

    // ── 5. Dados do período filtrado ──────────────────────────────────────
    const periodSales = await prisma.sale.findMany({
      where: { createdAt: { gte: periodStart, lte: periodEnd }, NOT: { status: 'cancelled' } },
      include: {
        payments: { select: { method: true, value: true, label: true } },
        items: {
          select: {
            quantity: true,
            priceUnit: true,
            subtotal: true,
            productName: true,
            productId: true,
          },
        },
      },
    });

    // Agrega pagamentos por método
    const byPaymentMethod: Record<string, number> = {
      dinheiro: 0, pix: 0, credito: 0, debito: 0,
    };
    periodSales.forEach(sale => {
      sale.payments.forEach(p => {
        const method = (p.label || p.method) as string;
        byPaymentMethod[method] = (byPaymentMethod[method] ?? 0) + Number(p.value);
      });
    });

    // Agrega faturamento por recortes temporais (Hora, Dia, Semana, Mês)
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;

    const byDay: Record<string, number> = {};
    const byWeek: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    periodSales.forEach(sale => {
      const saleDate = new Date((sale as any).createdAt);
      const brDate = new Date(saleDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const saleTotal = Number((sale as any).total || 0);

      // 1. Agregação por Hora
      const brHour = brDate.getHours();
      byHour[brHour] = (byHour[brHour] ?? 0) + saleTotal;

      // 2. Agregação por Dia (YYYY-MM-DD)
      const dayKey = `${brDate.getFullYear()}-${String(brDate.getMonth() + 1).padStart(2, '0')}-${String(brDate.getDate()).padStart(2, '0')}`;
      byDay[dayKey] = (byDay[dayKey] ?? 0) + saleTotal;

      // 3. Agregação por Semana (YYYY-MM-DD da segunda-feira correspondente)
      const monday = new Date(brDate);
      const dayOfWeek = monday.getDay();
      const diffToMonday = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      monday.setDate(diffToMonday);
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      byWeek[weekKey] = (byWeek[weekKey] ?? 0) + saleTotal;

      // 4. Agregação por Mês (YYYY-MM)
      const monthKey = `${brDate.getFullYear()}-${String(brDate.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] ?? 0) + saleTotal;

      // Agregação de produtos vendidos
      sale.items.forEach(item => {
        const key = item.productId as string;
        const name = (item.productName as string) || 'Desconhecido';
        if (!productMap[key]) productMap[key] = { name, qty: 0, revenue: 0 };
        productMap[key].qty += Number(item.quantity);
        productMap[key].revenue += Number(item.subtotal);
      });
    });

    const periodRevenue = periodSales.reduce((acc, s) => acc + Number((s as any).total), 0);

    // Lista total de produtos vendidos ordenados por faturamento decrescente
    const productsSold = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map(p => ({
        name: p.name,
        qty: p.qty,
        revenue: p.revenue,
      }));

    // Top 8 produtos para a widget lateral clássica
    const topProducts = productsSold.slice(0, 8).map(p => ({
      name: p.name,
      qty: p.qty,
      revenue: p.revenue,
      pct: periodRevenue > 0 ? (p.revenue / periodRevenue) * 100 : 0,
    }));

    const avgTicket = periodSales.length > 0
      ? periodRevenue / periodSales.length
      : 0;

    // ── 6. Alertas de Contas a Pagar ─────────────────────────────────────────
    const alertThreshold = new Date(todayEnd);
    alertThreshold.setDate(alertThreshold.getDate() + 3); // Próximos 3 dias

    const payablesAlerts = await prisma.payable.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: alertThreshold }
      },
      orderBy: { dueDate: 'asc' }
    });

    const overduePayables = payablesAlerts.filter(p => p.dueDate < todayStart);
    const upcomingPayables = payablesAlerts.filter(p => p.dueDate >= todayStart);

    return {
      currentRegister: openRegister
        ? {
            total: currentRegisterRevenue,
            operatorName: (openRegister as any).operator?.name ?? 'Operador',
            cashRegisterId: openRegister.id,
            openedAt: (openRegister as any).openingTime,
          }
        : null,
      today: {
        revenue: Number(todayAgg._sum.total ?? 0),
        transactions: Number(todayAgg._count.id ?? 0),
      },
      week: {
        revenue: weekRevenue,
        vsLastWeek,
      },
      month: {
        revenue: Number(monthAgg._sum.total ?? 0),
      },
      period: {
        revenue: periodRevenue,
        transactions: periodSales.length,
        avgTicket,
        byPaymentMethod,
        byHour,
        byDay,
        byWeek,
        byMonth,
        topProducts,
        productsSold,
      },
      alerts: {
        overduePayables,
        upcomingPayables,
      }
    };
  }
}
