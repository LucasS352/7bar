import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const SUMMARY_CACHE_TTL_MS = 20_000;
const MAX_CACHE_ENTRIES = 128;

interface SummaryCacheEntry {
  until: number;
  value?: any;
  inFlight?: Promise<any>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatBrDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getWeekMondayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(d + offset);
  return dt.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  private readonly summaryCache = new Map<string, SummaryCacheEntry>();

  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService,
  ) {}

  invalidateCache(tenantId?: string) {
    if (!tenantId) {
      this.summaryCache.clear();
      return;
    }
    const prefix = `${tenantId}:`;
    for (const key of this.summaryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.summaryCache.delete(key);
      }
    }
  }

  async getSummary(
    tenantId: string,
    startDate: string,
    endDate: string,
    forceRefresh = false,
  ) {
    const todayStr = formatBrDate(new Date());
    const safeStart = DATE_RE.test(startDate) ? startDate : todayStr;
    const safeEnd = DATE_RE.test(endDate) ? endDate : todayStr;
    const cacheKey = `${tenantId}:${safeStart}:${safeEnd}`;
    const nowMs = Date.now();

    const existing = this.summaryCache.get(cacheKey);
    if (!forceRefresh && existing) {
      if (existing.value !== undefined && existing.until > nowMs) {
        return existing.value;
      }
      if (existing.inFlight) {
        return existing.inFlight;
      }
    }

    if (this.summaryCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.summaryCache.keys().next().value;
      if (oldestKey) this.summaryCache.delete(oldestKey);
    }

    const entry: SummaryCacheEntry = { until: 0 };
    const inFlight = this.computeSummary(tenantId, safeStart, safeEnd, todayStr)
      .then((value) => {
        entry.value = value;
        entry.until = Date.now() + SUMMARY_CACHE_TTL_MS;
        entry.inFlight = undefined;
        return value;
      })
      .catch((err) => {
        if (this.summaryCache.get(cacheKey) === entry) {
          this.summaryCache.delete(cacheKey);
        }
        throw err;
      });
    entry.inFlight = inFlight;
    this.summaryCache.set(cacheKey, entry);

    return inFlight;
  }

  private async computeSummary(
    tenantId: string,
    startDate: string,
    endDate: string,
    todayStr: string,
  ) {
    const { databaseUrl } = this.tenantContext.get();
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

    // ── Definir janelas de tempo em BRT (-03:00) ───────────────────────────
    const todayStart = new Date(`${todayStr}T00:00:00-03:00`);
    const todayEnd = new Date(`${todayStr}T23:59:59.999-03:00`);

    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(tY, tM - 1, tD));
    const weekDayBr = todayUtc.getUTCDay(); // 0=dom, 1=seg … 6=sab
    const weekOffsetDays = weekDayBr === 0 ? -6 : 1 - weekDayBr;
    const weekStartUtc = new Date(Date.UTC(tY, tM - 1, tD + weekOffsetDays));
    const weekStartStr = weekStartUtc.toISOString().slice(0, 10);
    const weekStart = new Date(`${weekStartStr}T00:00:00-03:00`);

    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart.getTime() - 1);

    const monthStart = new Date(
      `${todayStr.slice(0, 7)}-01T00:00:00-03:00`,
    );

    const kpiMinStart = prevWeekStart < monthStart ? prevWeekStart : monthStart;

    const alertCutoff = new Date(todayEnd);
    alertCutoff.setDate(alertCutoff.getDate() + 3);

    // ── Janela de período customizado do filtro (fuso -03:00) ──────────────
    const periodStart = new Date(`${startDate}T00:00:00-03:00`);
    const periodEnd = new Date(`${endDate}T23:59:59.999-03:00`);

    // ── Todas as agregações direto no MySQL em PARALELO (6 queries cabendo no pool) ──
    const [
      openRegisterRows,
      kpiAggRows,
      hourDayRows,
      paymentRows,
      productRows,
      payablesAlerts,
    ] = await Promise.all([
      // 1. Caixas abertos + faturamento por caixa em 1 query
      prisma.$queryRaw<
        Array<{
          cashRegisterId: string;
          code: number | null;
          operatorName: string | null;
          operatorId: string | null;
          openedAt: Date;
          openingValue: Prisma.Decimal | number | null;
          total: Prisma.Decimal | number | null;
          salesCount: bigint | number | null;
        }>
      >(Prisma.sql`
        SELECT
          cr.id AS cashRegisterId,
          cr.code AS code,
          COALESCE(op.name, 'Operador') AS operatorName,
          cr.operatorId AS operatorId,
          cr.openingTime AS openedAt,
          COALESCE(cr.openingValue, 0) AS openingValue,
          COALESCE(SUM(CASE WHEN s.id IS NOT NULL AND s.status <> 'cancelled' AND s.source <> 'ajuste_fiscal' THEN s.total ELSE 0 END), 0) AS total,
          COALESCE(COUNT(CASE WHEN s.id IS NOT NULL AND s.status <> 'cancelled' AND s.source <> 'ajuste_fiscal' THEN 1 ELSE NULL END), 0) AS salesCount
        FROM cash_registers cr
        LEFT JOIN operators op ON op.id = cr.operatorId
        LEFT JOIN sales s ON s.cashRegisterId = cr.id
        WHERE cr.status = 'open'
        GROUP BY cr.id, cr.code, op.name, cr.operatorId, cr.openingTime, cr.openingValue
        ORDER BY cr.openingTime ASC
      `),

      // 2. Hoje / Semana / Semana Anterior / Mês em 1 única varredura no índice createdAt
      prisma.$queryRaw<
        Array<{
          todayRevenue: Prisma.Decimal | number | null;
          todayTransactions: bigint | number | null;
          weekRevenue: Prisma.Decimal | number | null;
          prevWeekRevenue: Prisma.Decimal | number | null;
          monthRevenue: Prisma.Decimal | number | null;
        }>
      >(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN createdAt >= ${todayStart} THEN total ELSE 0 END), 0) AS todayRevenue,
          COALESCE(SUM(CASE WHEN createdAt >= ${todayStart} THEN 1 ELSE 0 END), 0) AS todayTransactions,
          COALESCE(SUM(CASE WHEN createdAt >= ${weekStart} THEN total ELSE 0 END), 0) AS weekRevenue,
          COALESCE(SUM(CASE WHEN createdAt >= ${prevWeekStart} AND createdAt <= ${prevWeekEnd} THEN total ELSE 0 END), 0) AS prevWeekRevenue,
          COALESCE(SUM(CASE WHEN createdAt >= ${monthStart} THEN total ELSE 0 END), 0) AS monthRevenue
        FROM sales
        WHERE createdAt >= ${kpiMinStart} AND createdAt <= ${todayEnd}
          AND status <> 'cancelled'
          AND source <> 'ajuste_fiscal'
      `),

      // 3. Período agregado por hora + dia em 1 única varredura (fuso BRT -03:00)
      prisma.$queryRaw<
        Array<{
          brHour: number;
          dayKey: string;
          revenue: Prisma.Decimal | number | null;
          transactions: bigint | number | null;
        }>
      >(Prisma.sql`
        SELECT
          HOUR(DATE_SUB(createdAt, INTERVAL 3 HOUR)) AS brHour,
          DATE_FORMAT(DATE_SUB(createdAt, INTERVAL 3 HOUR), '%Y-%m-%d') AS dayKey,
          COALESCE(SUM(total), 0) AS revenue,
          COUNT(*) AS transactions
        FROM sales
        WHERE createdAt >= ${periodStart} AND createdAt <= ${periodEnd}
          AND status <> 'cancelled'
          AND source <> 'ajuste_fiscal'
        GROUP BY brHour, dayKey
        ORDER BY dayKey ASC
      `),

      // 4. Mix de pagamentos do período agregado no MySQL
      prisma.$queryRaw<
        Array<{
          method: string | null;
          label: string | null;
          total: Prisma.Decimal | number | null;
        }>
      >(Prisma.sql`
        SELECT
          p.method AS method,
          p.label AS label,
          COALESCE(SUM(p.value), 0) AS total
        FROM payments p
        INNER JOIN sales s ON s.id = p.saleId
        WHERE s.createdAt >= ${periodStart} AND s.createdAt <= ${periodEnd}
          AND s.status <> 'cancelled'
          AND s.source <> 'ajuste_fiscal'
        GROUP BY p.method, p.label
      `),

      // 5. Ranking de produtos vendidos no período agregado no MySQL
      prisma.$queryRaw<
        Array<{
          productId: string;
          name: string | null;
          qty: Prisma.Decimal | number | null;
          revenue: Prisma.Decimal | number | null;
        }>
      >(Prisma.sql`
        SELECT
          si.productId AS productId,
          COALESCE(NULLIF(MAX(NULLIF(si.productName, '')), ''), 'Desconhecido') AS name,
          COALESCE(SUM(si.quantity), 0) AS qty,
          COALESCE(SUM(si.subtotal), 0) AS revenue
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.saleId
        WHERE s.createdAt >= ${periodStart} AND s.createdAt <= ${periodEnd}
          AND s.status <> 'cancelled'
          AND s.source <> 'ajuste_fiscal'
        GROUP BY si.productId
        ORDER BY revenue DESC
      `),

      // 6. Alertas de contas a pagar (próximos 3 dias)
      prisma.payable.findMany({
        where: {
          status: 'PENDING',
          dueDate: { lte: alertCutoff },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const openRegistersWithRevenue = openRegisterRows.map((reg) => ({
      cashRegisterId: reg.cashRegisterId,
      code: reg.code,
      operatorName: reg.operatorName ?? 'Operador',
      operatorId: reg.operatorId,
      openedAt: reg.openedAt,
      openingValue: Number(reg.openingValue ?? 0),
      total: Number(reg.total ?? 0),
      salesCount: Number(reg.salesCount ?? 0),
    }));

    const kpi = kpiAggRows[0];
    const todayRevenue = Number(kpi?.todayRevenue ?? 0);
    const todayTransactions = Number(kpi?.todayTransactions ?? 0);
    const weekRevenue = Number(kpi?.weekRevenue ?? 0);
    const prevWeekRevenue = Number(kpi?.prevWeekRevenue ?? 0);
    const monthRevenue = Number(kpi?.monthRevenue ?? 0);
    const vsLastWeek = prevWeekRevenue > 0
      ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
      : null;

    // Agrega pagamentos normalizados sobre as poucas linhas retornadas
    const byPaymentMethod: Record<string, number> = {
      dinheiro: 0, pix: 0, credito: 0, debito: 0,
    };
    for (const p of paymentRows) {
      const rawKey = (
        (p.method && isNaN(Number(p.method)))
          ? p.method
          : (p.label && isNaN(Number(p.label)))
            ? p.label
            : 'credito'
      ).toLowerCase();
      let normKey = 'credito';
      if (rawKey.includes('dinh')) normKey = 'dinheiro';
      else if (rawKey.includes('pix')) normKey = 'pix';
      else if (rawKey.includes('cred')) normKey = 'credito';
      else if (rawKey.includes('deb')) normKey = 'debito';
      else if (rawKey.includes('consumo')) normKey = 'consumo_funcionario';

      byPaymentMethod[normKey] = (byPaymentMethod[normKey] ?? 0) + Number(p.total ?? 0);
    }

    // Agrega Hora, Dia, Semana, Mês e totais do período a partir de 1 única query
    const byHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) byHour[h] = 0;

    let periodRevenue = 0;
    let periodTransactions = 0;
    const byDay: Record<string, number> = {};
    const byWeek: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    for (const row of hourDayRows) {
      const hour = Number(row.brHour);
      const dayKey = String(row.dayKey ?? '');
      const rev = Number(row.revenue ?? 0);
      const txCount = Number(row.transactions ?? 0);

      if (hour >= 0 && hour <= 23) {
        byHour[hour] = (byHour[hour] ?? 0) + rev;
      }
      periodRevenue += rev;
      periodTransactions += txCount;

      if (dayKey) {
        byDay[dayKey] = (byDay[dayKey] ?? 0) + rev;

        const weekKey = getWeekMondayKey(dayKey);
        byWeek[weekKey] = (byWeek[weekKey] ?? 0) + rev;

        const monthKey = dayKey.slice(0, 7);
        byMonth[monthKey] = (byMonth[monthKey] ?? 0) + rev;
      }
    }

    const productsSold = productRows.map((p) => ({
      name: p.name || 'Desconhecido',
      qty: Number(p.qty ?? 0),
      revenue: Number(p.revenue ?? 0),
    }));

    const topProducts = productsSold.slice(0, 8).map((p) => ({
      name: p.name,
      qty: p.qty,
      revenue: p.revenue,
      pct: periodRevenue > 0 ? (p.revenue / periodRevenue) * 100 : 0,
    }));

    const avgTicket = periodTransactions > 0 ? periodRevenue / periodTransactions : 0;

    const overduePayables = payablesAlerts.filter((p) => p.dueDate < todayStart);
    const upcomingPayables = payablesAlerts.filter((p) => p.dueDate >= todayStart);

    return {
      openRegisters: openRegistersWithRevenue,
      currentRegister: openRegistersWithRevenue.length > 0 ? openRegistersWithRevenue[0] : null,
      today: {
        revenue: todayRevenue,
        transactions: todayTransactions,
      },
      week: {
        revenue: weekRevenue,
        vsLastWeek,
      },
      month: {
        revenue: monthRevenue,
      },
      period: {
        revenue: periodRevenue,
        transactions: periodTransactions,
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
      },
    };
  }
}
