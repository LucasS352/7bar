import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { ProductsService } from '../products/products.service';
import { reportPeriod } from './reports.period';
import { computeMarginPercent, DailySalesRow, previousReportPeriod, salesTrends } from './reports.trends';
import type {
  AdegaInsight,
  AdegaInsightsResponse,
  CategoryMixBucket,
  CostSourceKind,
  HourlyMovementBucket,
  PaymentMixBucket,
  ProductRankingItem,
  ProductRankingQuery,
  ProductRankingResponse,
  ProductRankingSort,
  SalesReportResponse,
  SlowMovingProductItem,
  StockAlertStatus,
  StockoutRiskItem,
  UncostedProductEditorItem,
  UncostedProductsResponse,
  UncostedScope,
  UpdateProductCostsResponse,
  WeekdayMovementBucket,
} from './reports.types';

const VALID_SORTS: readonly ProductRankingSort[] = ['profit', 'revenue', 'quantity', 'margin', 'cost'];

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Domingo',
  2: 'Segunda-feira',
  3: 'Terça-feira',
  4: 'Quarta-feira',
  5: 'Quinta-feira',
  6: 'Sexta-feira',
  7: 'Sábado',
};

function toDec(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined || value === '') return new Prisma.Decimal(0);
  return new Prisma.Decimal(String(value));
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampRankingLimit(rawLimit: unknown): number {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') return 50;
  const n = Number(rawLimit);
  if (!Number.isFinite(n)) throw new BadRequestException('Parâmetro limit inválido.');
  return Math.max(1, Math.min(100, Math.trunc(n)));
}

function normalizeSort(rawSort: unknown): ProductRankingSort {
  if (rawSort === undefined || rawSort === null || rawSort === '') return 'profit';
  if (typeof rawSort === 'string' && VALID_SORTS.includes(rawSort as ProductRankingSort)) {
    return rawSort as ProductRankingSort;
  }
  throw new BadRequestException(`Ordenação inválida. Use: ${VALID_SORTS.join(', ')}.`);
}

function resolveCostSource(
  historicalRev: Prisma.Decimal,
  fallbackRev: Prisma.Decimal,
  uncostedRev: Prisma.Decimal,
): CostSourceKind {
  const hasHist = historicalRev.gt(0);
  const hasFallback = fallbackRev.gt(0);
  const hasUncosted = uncostedRev.gt(0);
  if (hasHist && !hasFallback && !hasUncosted) return 'historical';
  if (!hasHist && hasFallback && !hasUncosted) return 'catalog_fallback';
  if (!hasHist && !hasFallback) return 'untracked';
  return 'mixed';
}

function resolveStockAlert(
  stock: Prisma.Decimal | null,
  minStock: Prisma.Decimal | null,
  isComposite: boolean,
): StockAlertStatus {
  if (isComposite || stock === null) return 'unknown';
  if (stock.lte(0)) return 'out';
  if (minStock !== null && stock.lte(minStock)) return 'low';
  if (minStock === null && stock.lte(5)) return 'low';
  return 'ok';
}

function normalizePaymentLabel(rawMethod: string | null, rawLabel: string | null): { key: string; label: string } {
  const method = (rawMethod || '').trim().toLowerCase();
  const label = (rawLabel || '').trim();
  const probe = `${method} ${label.toLowerCase()}`.trim();

  if (method === 'dinheiro' || method === 'cash' || probe.includes('dinheiro')) {
    return { key: 'dinheiro', label: 'Dinheiro' };
  }
  if (method === 'pix' || probe.includes('pix')) {
    return { key: 'pix', label: 'PIX' };
  }
  if (method === 'credito' || method === 'credit' || probe.includes('crédito') || probe.includes('credito')) {
    return { key: 'credito', label: 'Cartão de Crédito' };
  }
  if (method === 'debito' || method === 'debit' || probe.includes('débito') || probe.includes('debito')) {
    return { key: 'debito', label: 'Cartão de Débito' };
  }
  if (method === 'consumo_funcionario' || probe.includes('consumo')) {
    return { key: 'consumo_funcionario', label: 'Consumo Equipe' };
  }
  if (label) {
    return { key: `custom:${label.toLowerCase()}`, label };
  }
  return { key: method || 'outros', label: rawMethod || 'Outros' };
}

function formatBrl(value: Prisma.Decimal | string | number): string {
  const n = value instanceof Prisma.Decimal ? Number(value.toFixed(2)) : Number(value);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface RawCostSummaryRow {
  itemsSubtotal: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
  historicalCostRevenue: Prisma.Decimal | null;
  fallbackCostRevenue: Prisma.Decimal | null;
  uncostedRevenue: Prisma.Decimal | null;
  uncostedItemsCount: bigint | number | null;
}

interface RawDailyCostRow {
  date: string;
  totalCost: Prisma.Decimal | null;
}

interface RawTopProductRow {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  quantity: Prisma.Decimal | null;
  itemSubtotal: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
}

interface RawUncostedProductRow {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  quantity: Prisma.Decimal | null;
  itemSubtotal: Prisma.Decimal | null;
}

interface RawRankingRow {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
  categoryId: string | null;
  categoryName: string;
  salesCount: bigint | number;
  quantity: Prisma.Decimal | null;
  itemSubtotal: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
  grossProfit: Prisma.Decimal | null;
  historicalRev: Prisma.Decimal | null;
  fallbackRev: Prisma.Decimal | null;
  uncostedRev: Prisma.Decimal | null;
  currentStock: Prisma.Decimal | null;
  minStock: Prisma.Decimal | null;
  isComposite: number | boolean;
}

interface RawRankingTotalsRow {
  distinctProducts: bigint | number;
  totalUnitsSold: Prisma.Decimal | null;
  totalRevenue: Prisma.Decimal | null;
  totalCost: Prisma.Decimal | null;
  uncostedInPeriodCount: bigint | number;
  uncostedInPeriodRevenue: Prisma.Decimal | null;
}

interface RawUncostedEditorRow {
  productId: string;
  name: string;
  shortCode: string | null;
  barcode: string | null;
  unit: string;
  imageUrl?: string | null;
  categoryId: string | null;
  categoryName: string;
  priceSell: Prisma.Decimal | null;
  priceCost: Prisma.Decimal | null;
  currentStock: Prisma.Decimal | null;
  isComposite: number | boolean;
  soldQuantity: Prisma.Decimal | null;
  itemSubtotal: Prisma.Decimal | null;
  salesCount: bigint | number;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantContext: TenantContextService,
    @Optional() private readonly productsService?: ProductsService,
  ) {}

  private async getClient() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async sales(startDate: unknown, endDate: unknown): Promise<SalesReportResponse> {
    const period = reportPeriod(startDate, endDate);
    const previous = previousReportPeriod(period);
    const prisma = await this.getClient();

    const where: Prisma.SaleWhereInput = {
      status: 'completed',
      source: { not: 'ajuste_fiscal' },
      createdAt: { gte: period.start, lt: period.endExclusive },
    };

    // Todas as leituras usam o mesmo snapshot RepeatableRead; custos e vendas
    // são agregados separadamente para evitar multiplicação de totais por joins.
    const [salesAgg, costRows, topProductsRows, dailySalesRows, dailyCostRows, uncostedRows] = await prisma.$transaction(
      [
        prisma.sale.aggregate({
          where,
          _count: { _all: true },
          _sum: { total: true, discount: true, addition: true },
        }),
        prisma.$queryRaw<RawCostSummaryRow[]>(Prisma.sql`
          SELECT
            COALESCE(SUM(si.subtotal), 0) AS itemsSubtotal,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost,
            COALESCE(SUM(CASE WHEN si.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS historicalCostRevenue,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND p.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS fallbackCostRevenue,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.subtotal ELSE 0 END), 0) AS uncostedRevenue,
            COALESCE(COUNT(DISTINCT CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.productId ELSE NULL END), 0) AS uncostedItemsCount
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
        `),
        prisma.$queryRaw<RawTopProductRow[]>(Prisma.sql`
          SELECT
            si.productId AS productId,
            si.productName AS name,
            si.unit AS unit,
            MAX(p.imageUrl) AS imageUrl,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.subtotal), 0) AS itemSubtotal,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY si.productId, si.productName, si.unit
          ORDER BY itemSubtotal DESC, si.productId ASC, si.productName ASC, si.unit ASC
          LIMIT 20
        `),
        prisma.$queryRaw<DailySalesRow[]>(Prisma.sql`
          SELECT DATE_FORMAT(DATE_SUB(createdAt, INTERVAL 3 HOUR), '%Y-%m-%d') AS date,
            SUM(total) AS revenue, COUNT(*) AS transactions
          FROM sales
          WHERE createdAt >= ${previous.start} AND createdAt < ${period.endExclusive}
            AND status = 'completed' AND (source IS NULL OR source <> 'ajuste_fiscal')
          GROUP BY date ORDER BY date
        `),
        prisma.$queryRaw<RawDailyCostRow[]>(Prisma.sql`
          SELECT DATE_FORMAT(DATE_SUB(s.createdAt, INTERVAL 3 HOUR), '%Y-%m-%d') AS date,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${previous.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY date ORDER BY date
        `),
        prisma.$queryRaw<RawUncostedProductRow[]>(Prisma.sql`
          SELECT
            si.productId AS productId,
            COALESCE(p.name, MAX(si.productName)) AS name,
            COALESCE(p.unit, MAX(si.unit)) AS unit,
            MAX(p.imageUrl) AS imageUrl,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.subtotal), 0) AS itemSubtotal
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
            AND (si.priceCost IS NULL OR si.priceCost <= 0)
            AND (p.priceCost IS NULL OR p.priceCost <= 0)
          GROUP BY si.productId, p.name, p.unit
          ORDER BY itemSubtotal DESC, name ASC
          LIMIT 20
        `),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const revenue = toDec(salesAgg._sum.total);
    const transactions = Number(salesAgg._count._all ?? 0);
    const costRow = costRows[0];
    const itemsSubtotal = toDec(costRow?.itemsSubtotal);
    const totalCost = toDec(costRow?.totalCost);
    const historicalCostRevenue = toDec(costRow?.historicalCostRevenue);
    const fallbackCostRevenue = toDec(costRow?.fallbackCostRevenue);
    const uncostedRevenue = toDec(costRow?.uncostedRevenue);
    const uncostedItemsCount = Number(costRow?.uncostedItemsCount ?? 0);

    const grossProfit = revenue.minus(totalCost);
    const costedRevenue = itemsSubtotal.minus(uncostedRevenue);
    const costCoveragePercent = itemsSubtotal.gt(0)
      ? costedRevenue.div(itemsSubtotal).mul(100).toFixed(2)
      : '100.00';

    const dailyCostByDate = new Map(dailyCostRows.map((row) => [row.date, toDec(row.totalCost)]));
    const mergedDailyRows: DailySalesRow[] = dailySalesRows.map((row) => ({
      ...row,
      totalCost: dailyCostByDate.get(row.date) ?? new Prisma.Decimal(0),
    }));

    const now = new Date();
    const trends = salesTrends(period, mergedDailyRows, { revenue, totalCost }, now);

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        days: period.days,
        timezone: period.timezone,
        includesOpenDays: period.endExclusive > now,
      },
      daily: trends.daily,
      comparison: trends.comparison,
      summary: {
        revenue: revenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        marginPercent: computeMarginPercent(grossProfit, revenue),
        markupPercent: totalCost.gt(0) ? grossProfit.div(totalCost).mul(100).toFixed(2) : null,
        itemsSubtotal: itemsSubtotal.toFixed(2),
        saleDiscounts: toDec(salesAgg._sum.discount).toFixed(2),
        saleAdditions: toDec(salesAgg._sum.addition).toFixed(2),
        transactions,
        averageTicket: transactions ? revenue.div(transactions).toFixed(2) : '0.00',
        averageProfitPerSale: transactions ? grossProfit.div(transactions).toFixed(2) : '0.00',
        costCoveragePercent,
        historicalCostRevenue: historicalCostRevenue.toFixed(2),
        fallbackCostRevenue: fallbackCostRevenue.toFixed(2),
        uncostedRevenue: uncostedRevenue.toFixed(2),
        uncostedItemsCount,
      },
      productLimit: 20,
      products: topProductsRows.map((p) => {
        const sub = toDec(p.itemSubtotal);
        const cost = toDec(p.totalCost);
        const profit = sub.minus(cost);
        return {
          productId: p.productId,
          name: p.name,
          unit: p.unit,
          imageUrl: normalizeImageUrl(p.imageUrl),
          quantity: toDec(p.quantity).toFixed(3),
          itemSubtotal: sub.toFixed(2),
          totalCost: cost.toFixed(2),
          grossProfit: profit.toFixed(2),
          marginPercent: computeMarginPercent(profit, sub),
        };
      }),
      uncostedProducts: uncostedRows.map((u) => ({
        productId: u.productId,
        name: u.name,
        unit: u.unit,
        imageUrl: normalizeImageUrl(u.imageUrl),
        quantity: toDec(u.quantity).toFixed(3),
        itemSubtotal: toDec(u.itemSubtotal).toFixed(2),
      })),
    };
  }

  async productsRanking(query: ProductRankingQuery): Promise<ProductRankingResponse> {
    const period = reportPeriod(query.startDate, query.endDate);
    const sortBy = normalizeSort(query.sortBy);
    const limit = clampRankingLimit(query.limit);
    const categoryId =
      typeof query.categoryId === 'string' && query.categoryId.trim() ? query.categoryId.trim() : null;
    const search =
      typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 60) : null;

    const prisma = await this.getClient();

    const categoryFilterSql = categoryId ? Prisma.sql`AND p.categoryId = ${categoryId}` : Prisma.empty;
    const searchPattern = search ? `%${search}%` : null;
    const searchFilterSql = searchPattern
      ? Prisma.sql`AND COALESCE(p.name, si.productName) LIKE ${searchPattern}`
      : Prisma.empty;

    const orderBySql = (() => {
      switch (sortBy) {
        case 'revenue':
          return Prisma.sql`itemSubtotal DESC, grossProfit DESC, productId ASC`;
        case 'quantity':
          return Prisma.sql`quantity DESC, itemSubtotal DESC, productId ASC`;
        case 'margin':
          return Prisma.sql`(CASE WHEN COALESCE(SUM(si.subtotal), 0) > 0 THEN (COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0)) / COALESCE(SUM(si.subtotal), 0) ELSE -999999 END) DESC, grossProfit DESC, productId ASC`;
        case 'cost':
          return Prisma.sql`totalCost DESC, itemSubtotal DESC, productId ASC`;
        case 'profit':
        default:
          return Prisma.sql`grossProfit DESC, itemSubtotal DESC, productId ASC`;
      }
    })();

    const [totalsRows, rankingRows, categories, uncostedCatalogCount] = await prisma.$transaction(
      [
        prisma.$queryRaw<RawRankingTotalsRow[]>(Prisma.sql`
          SELECT
            COUNT(DISTINCT si.productId) AS distinctProducts,
            COALESCE(SUM(si.quantity), 0) AS totalUnitsSold,
            COALESCE(SUM(si.subtotal), 0) AS totalRevenue,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost,
            COALESCE(COUNT(DISTINCT CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.productId ELSE NULL END), 0) AS uncostedInPeriodCount,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.subtotal ELSE 0 END), 0) AS uncostedInPeriodRevenue
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
            ${categoryFilterSql}
            ${searchFilterSql}
        `),
        prisma.$queryRaw<RawRankingRow[]>(Prisma.sql`
          SELECT
            si.productId AS productId,
            COALESCE(p.name, MAX(si.productName)) AS name,
            COALESCE(p.unit, MAX(si.unit)) AS unit,
            MAX(p.imageUrl) AS imageUrl,
            p.categoryId AS categoryId,
            COALESCE(c.name, 'Sem Categoria') AS categoryName,
            COUNT(DISTINCT si.saleId) AS salesCount,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.subtotal), 0) AS itemSubtotal,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost,
            COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS grossProfit,
            COALESCE(SUM(CASE WHEN si.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS historicalRev,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND p.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS fallbackRev,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.subtotal ELSE 0 END), 0) AS uncostedRev,
            p.stock AS currentStock,
            p.minStock AS minStock,
            COALESCE(p.isComposite, 0) AS isComposite
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          LEFT JOIN categories c ON c.id = p.categoryId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
            ${categoryFilterSql}
            ${searchFilterSql}
          GROUP BY si.productId, p.name, p.unit, p.categoryId, c.name, p.stock, p.minStock, p.isComposite
          ORDER BY ${orderBySql}
          LIMIT ${Prisma.raw(String(limit))}
        `),
        prisma.category.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        prisma.product.count({
          where: {
            active: true,
            priceCost: { lte: 0 },
            ...(categoryId ? { categoryId } : {}),
            ...(search ? { name: { contains: search } } : {}),
          },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const totalsRow = totalsRows[0];
    const totalRevenue = toDec(totalsRow?.totalRevenue);
    const totalCost = toDec(totalsRow?.totalCost);
    const totalGrossProfit = totalRevenue.minus(totalCost);

    const items = rankingRows.map((row, idx) =>
      this.mapRankingRow(row, idx + 1, totalRevenue, totalGrossProfit),
    );

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        days: period.days,
        timezone: period.timezone,
      },
      filters: {
        sortBy,
        categoryId,
        search,
        limit,
      },
      totals: {
        distinctProducts: Number(totalsRow?.distinctProducts ?? 0),
        totalUnitsSold: toDec(totalsRow?.totalUnitsSold).toFixed(3),
        totalRevenue: totalRevenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalGrossProfit: totalGrossProfit.toFixed(2),
        averageMarginPercent: computeMarginPercent(totalGrossProfit, totalRevenue),
        uncostedInPeriodCount: Number(totalsRow?.uncostedInPeriodCount ?? 0),
        uncostedInPeriodRevenue: toDec(totalsRow?.uncostedInPeriodRevenue).toFixed(2),
        uncostedCatalogCount: Number(uncostedCatalogCount ?? 0),
      },
      categories,
      items,
    };
  }

  async uncostedProducts(query: {
    startDate?: unknown;
    endDate?: unknown;
    scope?: unknown;
    categoryId?: unknown;
    search?: unknown;
  }): Promise<UncostedProductsResponse> {
    const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const period = reportPeriod(query.startDate ?? todayStr, query.endDate ?? todayStr);
    const scope: UncostedScope = query.scope === 'catalog' ? 'catalog' : 'period';
    const categoryId =
      typeof query.categoryId === 'string' && query.categoryId.trim() ? query.categoryId.trim() : null;
    const search =
      typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 60) : null;

    const prisma = await this.getClient();
    const categoryFilterSql = categoryId ? Prisma.sql`AND p.categoryId = ${categoryId}` : Prisma.empty;
    const searchPattern = search ? `%${search}%` : null;
    const periodSearchSql = searchPattern
      ? Prisma.sql`AND (p.name LIKE ${searchPattern} OR p.barcode LIKE ${searchPattern} OR p.shortCode LIKE ${searchPattern})`
      : Prisma.empty;
    const catalogSearchSql = searchPattern
      ? Prisma.sql`AND (p.name LIKE ${searchPattern} OR p.barcode LIKE ${searchPattern} OR p.shortCode LIKE ${searchPattern})`
      : Prisma.empty;

    const [inPeriodCountRows, catalogCount, categories, rows] = await prisma.$transaction(
      [
        prisma.$queryRaw<{ cnt: bigint | number }[]>(Prisma.sql`
          SELECT COUNT(DISTINCT si.productId) AS cnt
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          INNER JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
            AND p.active = 1
            AND (si.priceCost IS NULL OR si.priceCost <= 0)
            AND (p.priceCost IS NULL OR p.priceCost <= 0)
        `),
        prisma.product.count({
          where: { active: true, priceCost: { lte: 0 } },
        }),
        prisma.category.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        scope === 'period'
          ? prisma.$queryRaw<RawUncostedEditorRow[]>(Prisma.sql`
              SELECT
                p.id AS productId,
                COALESCE(p.name, MAX(si.productName)) AS name,
                p.shortCode AS shortCode,
                p.barcode AS barcode,
                COALESCE(p.unit, MAX(si.unit)) AS unit,
                MAX(p.imageUrl) AS imageUrl,
                p.categoryId AS categoryId,
                COALESCE(c.name, 'Sem Categoria') AS categoryName,
                COALESCE(p.priceSell, 0) AS priceSell,
                COALESCE(p.priceCost, 0) AS priceCost,
                p.stock AS currentStock,
                COALESCE(p.isComposite, 0) AS isComposite,
                COALESCE(SUM(si.quantity), 0) AS soldQuantity,
                COALESCE(SUM(si.subtotal), 0) AS itemSubtotal,
                COUNT(DISTINCT si.saleId) AS salesCount
              FROM sale_items si
              INNER JOIN sales s ON s.id = si.saleId
              INNER JOIN products p ON p.id = si.productId
              LEFT JOIN categories c ON c.id = p.categoryId
              WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
                AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
                AND p.active = 1
                AND (si.priceCost IS NULL OR si.priceCost <= 0)
                AND (p.priceCost IS NULL OR p.priceCost <= 0)
                ${categoryFilterSql}
                ${periodSearchSql}
              GROUP BY p.id, p.name, p.shortCode, p.barcode, p.unit, p.categoryId, c.name, p.priceSell, p.priceCost, p.stock, p.isComposite
              ORDER BY itemSubtotal DESC, name ASC
              LIMIT 200
            `)
          : prisma.$queryRaw<RawUncostedEditorRow[]>(Prisma.sql`
              SELECT
                p.id AS productId,
                p.name AS name,
                p.shortCode AS shortCode,
                p.barcode AS barcode,
                p.unit AS unit,
                p.imageUrl AS imageUrl,
                p.categoryId AS categoryId,
                COALESCE(c.name, 'Sem Categoria') AS categoryName,
                COALESCE(p.priceSell, 0) AS priceSell,
                COALESCE(p.priceCost, 0) AS priceCost,
                p.stock AS currentStock,
                COALESCE(p.isComposite, 0) AS isComposite,
                COALESCE(salesAgg.soldQuantity, 0) AS soldQuantity,
                COALESCE(salesAgg.itemSubtotal, 0) AS itemSubtotal,
                COALESCE(salesAgg.salesCount, 0) AS salesCount
              FROM products p
              LEFT JOIN categories c ON c.id = p.categoryId
              LEFT JOIN (
                SELECT
                  si.productId AS productId,
                  COALESCE(SUM(si.quantity), 0) AS soldQuantity,
                  COALESCE(SUM(si.subtotal), 0) AS itemSubtotal,
                  COUNT(DISTINCT si.saleId) AS salesCount
                FROM sale_items si
                INNER JOIN sales s ON s.id = si.saleId
                WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
                  AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
                GROUP BY si.productId
              ) salesAgg ON salesAgg.productId = p.id
              WHERE p.active = 1
                AND (p.priceCost IS NULL OR p.priceCost <= 0)
                ${categoryFilterSql}
                ${catalogSearchSql}
              ORDER BY itemSubtotal DESC, p.name ASC
              LIMIT 300
            `),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const items: UncostedProductEditorItem[] = rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      shortCode: r.shortCode ?? null,
      barcode: r.barcode ?? null,
      unit: r.unit,
      imageUrl: normalizeImageUrl(r.imageUrl),
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName,
      priceSell: toDec(r.priceSell).toFixed(2),
      priceCost: toDec(r.priceCost).toFixed(2),
      currentStock: r.currentStock !== null && r.currentStock !== undefined ? toDec(r.currentStock).toFixed(3) : null,
      isComposite: Boolean(r.isComposite),
      soldQuantity: toDec(r.soldQuantity).toFixed(3),
      itemSubtotal: toDec(r.itemSubtotal).toFixed(2),
      salesCount: Number(r.salesCount ?? 0),
    }));

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        days: period.days,
        timezone: period.timezone,
      },
      scope,
      counts: {
        inPeriod: Number(inPeriodCountRows[0]?.cnt ?? 0),
        catalog: Number(catalogCount ?? 0),
      },
      categories,
      items,
    };
  }

  async updateProductCosts(rawItems: unknown): Promise<UpdateProductCostsResponse> {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('Informe ao menos um produto para atualizar o preço de custo.');
    }
    if (rawItems.length > 200) {
      throw new BadRequestException('Limite máximo de 200 produtos por envio.');
    }

    const dedup = new Map<string, Prisma.Decimal>();
    for (const entry of rawItems) {
      if (!entry || typeof entry !== 'object') {
        throw new BadRequestException('Item inválido na atualização de custos.');
      }
      const { productId, priceCost } = entry as { productId?: unknown; priceCost?: unknown };
      if (typeof productId !== 'string' || !productId.trim()) {
        throw new BadRequestException('productId inválido.');
      }
      const numCost = Number(priceCost);
      if (!Number.isFinite(numCost) || numCost < 0 || numCost > 9_999_999.99) {
        throw new BadRequestException(`Preço de custo inválido para o produto ${productId}.`);
      }
      dedup.set(productId.trim(), new Prisma.Decimal(numCost).toDecimalPlaces(4));
    }

    const { tenantId, databaseUrl } = this.tenantContext.get();
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const ids = Array.from(dedup.keys());

    const existing = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((p) => p.id));
    const notFoundIds = ids.filter((id) => !existingSet.has(id));
    const validUpdates = ids.filter((id) => existingSet.has(id));

    if (validUpdates.length > 0) {
      await prisma.$transaction(
        validUpdates.map((id) =>
          prisma.product.update({
            where: { id },
            data: { priceCost: dedup.get(id)! },
          }),
        ),
      );
      this.productsService?.invalidateCache?.(tenantId);
    }

    return {
      updatedCount: validUpdates.length,
      notFoundIds,
    };
  }

  private mapRankingRow(
    row: RawRankingRow,
    rank: number,
    totalPeriodRevenue: Prisma.Decimal,
    totalPeriodProfit: Prisma.Decimal,
  ): ProductRankingItem {
    const qty = toDec(row.quantity);
    const sub = toDec(row.itemSubtotal);
    const cost = toDec(row.totalCost);
    const profit = sub.minus(cost);
    const histRev = toDec(row.historicalRev);
    const fallbackRev = toDec(row.fallbackRev);
    const uncostedRev = toDec(row.uncostedRev);
    const coveredRev = sub.minus(uncostedRev);
    const stock = row.currentStock !== null && row.currentStock !== undefined ? toDec(row.currentStock) : null;
    const minStock = row.minStock !== null && row.minStock !== undefined ? toDec(row.minStock) : null;
    const isComposite = Boolean(row.isComposite);

    return {
      rank,
      productId: row.productId,
      name: row.name,
      unit: row.unit,
      imageUrl: normalizeImageUrl(row.imageUrl),
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      salesCount: Number(row.salesCount ?? 0),
      quantity: qty.toFixed(3),
      avgSalePrice: qty.gt(0) ? sub.div(qty).toFixed(2) : '0.00',
      avgUnitCost: qty.gt(0) ? cost.div(qty).toFixed(2) : '0.00',
      itemSubtotal: sub.toFixed(2),
      revenueSharePercent: totalPeriodRevenue.gt(0) ? sub.div(totalPeriodRevenue).mul(100).toFixed(2) : null,
      totalCost: cost.toFixed(2),
      grossProfit: profit.toFixed(2),
      profitSharePercent: totalPeriodProfit.gt(0) ? profit.div(totalPeriodProfit).mul(100).toFixed(2) : null,
      marginPercent: computeMarginPercent(profit, sub),
      markupPercent: cost.gt(0) ? profit.div(cost).mul(100).toFixed(2) : null,
      costCoveragePercent: sub.gt(0) ? coveredRev.div(sub).mul(100).toFixed(2) : '100.00',
      costSource: resolveCostSource(histRev, fallbackRev, uncostedRev),
      currentStock: stock ? stock.toFixed(3) : null,
      minStock: minStock ? minStock.toFixed(3) : null,
      isComposite,
      stockAlert: resolveStockAlert(stock, minStock, isComposite),
    };
  }

  async adegaInsights(startDate: unknown, endDate: unknown): Promise<AdegaInsightsResponse> {
    const period = reportPeriod(startDate, endDate);
    const prisma = await this.getClient();

    const where: Prisma.SaleWhereInput = {
      status: 'completed',
      source: { not: 'ajuste_fiscal' },
      createdAt: { gte: period.start, lt: period.endExclusive },
    };

    const [
      salesAgg,
      costRows,
      hourRows,
      weekdaySaleRows,
      weekdayCostRows,
      paymentRows,
      categoryRows,
      allProductsRankingRows,
      slowMovingRows,
    ] = await prisma.$transaction(
      [
        prisma.sale.aggregate({
          where,
          _count: { _all: true },
          _sum: { total: true },
        }),
        prisma.$queryRaw<RawCostSummaryRow[]>(Prisma.sql`
          SELECT
            COALESCE(SUM(si.subtotal), 0) AS itemsSubtotal,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost,
            COALESCE(SUM(CASE WHEN si.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS historicalCostRevenue,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND p.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS fallbackCostRevenue,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.subtotal ELSE 0 END), 0) AS uncostedRevenue,
            COALESCE(COUNT(DISTINCT CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.productId ELSE NULL END), 0) AS uncostedItemsCount
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
        `),
        prisma.$queryRaw<{ hour: number; revenue: Prisma.Decimal | null; transactions: bigint }[]>(Prisma.sql`
          SELECT
            HOUR(DATE_SUB(createdAt, INTERVAL 3 HOUR)) AS hour,
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS transactions
          FROM sales
          WHERE createdAt >= ${period.start} AND createdAt < ${period.endExclusive}
            AND status = 'completed' AND (source IS NULL OR source <> 'ajuste_fiscal')
          GROUP BY hour
          ORDER BY hour ASC
        `),
        prisma.$queryRaw<{ dayOfWeek: number; revenue: Prisma.Decimal | null; transactions: bigint }[]>(Prisma.sql`
          SELECT
            DAYOFWEEK(DATE_SUB(createdAt, INTERVAL 3 HOUR)) AS dayOfWeek,
            COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) AS transactions
          FROM sales
          WHERE createdAt >= ${period.start} AND createdAt < ${period.endExclusive}
            AND status = 'completed' AND (source IS NULL OR source <> 'ajuste_fiscal')
          GROUP BY dayOfWeek
          ORDER BY dayOfWeek ASC
        `),
        prisma.$queryRaw<{ dayOfWeek: number; totalCost: Prisma.Decimal | null }[]>(Prisma.sql`
          SELECT
            DAYOFWEEK(DATE_SUB(s.createdAt, INTERVAL 3 HOUR)) AS dayOfWeek,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY dayOfWeek
        `),
        prisma.$queryRaw<
          { method: string | null; label: string | null; revenue: Prisma.Decimal | null; transactions: bigint }[]
        >(Prisma.sql`
          SELECT
            pay.method AS method,
            pay.label AS label,
            COALESCE(SUM(pay.value), 0) AS revenue,
            COUNT(DISTINCT s.id) AS transactions
          FROM payments pay
          INNER JOIN sales s ON s.id = pay.saleId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY pay.method, pay.label
          ORDER BY revenue DESC
        `),
        prisma.$queryRaw<
          {
            categoryId: string | null;
            categoryName: string;
            distinctProducts: bigint;
            quantity: Prisma.Decimal | null;
            revenue: Prisma.Decimal | null;
            totalCost: Prisma.Decimal | null;
          }[]
        >(Prisma.sql`
          SELECT
            p.categoryId AS categoryId,
            COALESCE(c.name, 'Sem Categoria') AS categoryName,
            COUNT(DISTINCT si.productId) AS distinctProducts,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.subtotal), 0) AS revenue,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          LEFT JOIN categories c ON c.id = p.categoryId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY p.categoryId, c.name
          ORDER BY revenue DESC
        `),
        prisma.$queryRaw<RawRankingRow[]>(Prisma.sql`
          SELECT
            si.productId AS productId,
            COALESCE(p.name, MAX(si.productName)) AS name,
            COALESCE(p.unit, MAX(si.unit)) AS unit,
            MAX(p.imageUrl) AS imageUrl,
            p.categoryId AS categoryId,
            COALESCE(c.name, 'Sem Categoria') AS categoryName,
            COUNT(DISTINCT si.saleId) AS salesCount,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.subtotal), 0) AS itemSubtotal,
            COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS totalCost,
            COALESCE(SUM(si.subtotal), 0) - COALESCE(SUM(si.quantity * (CASE WHEN si.priceCost > 0 THEN si.priceCost WHEN p.priceCost > 0 THEN p.priceCost ELSE 0 END)), 0) AS grossProfit,
            COALESCE(SUM(CASE WHEN si.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS historicalRev,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND p.priceCost > 0 THEN si.subtotal ELSE 0 END), 0) AS fallbackRev,
            COALESCE(SUM(CASE WHEN (si.priceCost IS NULL OR si.priceCost <= 0) AND (p.priceCost IS NULL OR p.priceCost <= 0) THEN si.subtotal ELSE 0 END), 0) AS uncostedRev,
            p.stock AS currentStock,
            p.minStock AS minStock,
            COALESCE(p.isComposite, 0) AS isComposite
          FROM sale_items si
          INNER JOIN sales s ON s.id = si.saleId
          LEFT JOIN products p ON p.id = si.productId
          LEFT JOIN categories c ON c.id = p.categoryId
          WHERE s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
            AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
          GROUP BY si.productId, p.name, p.unit, p.categoryId, c.name, p.stock, p.minStock, p.isComposite
          ORDER BY itemSubtotal DESC
          LIMIT 250
        `),
        prisma.$queryRaw<
          {
            productId: string;
            name: string;
            unit: string;
            imageUrl?: string | null;
            categoryName: string;
            currentStock: Prisma.Decimal;
            unitCost: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            tiedCapital: Prisma.Decimal;
          }[]
        >(Prisma.sql`
          SELECT
            p.id AS productId,
            p.name AS name,
            p.unit AS unit,
            p.imageUrl AS imageUrl,
            COALESCE(c.name, 'Sem Categoria') AS categoryName,
            p.stock AS currentStock,
            p.priceCost AS unitCost,
            p.priceSell AS unitPrice,
            (p.stock * p.priceCost) AS tiedCapital
          FROM products p
          LEFT JOIN categories c ON c.id = p.categoryId
          WHERE p.active = 1
            AND p.isComposite = 0
            AND p.stock > 0
            AND p.priceCost > 0
            AND NOT EXISTS (
              SELECT 1
              FROM sale_items si
              INNER JOIN sales s ON s.id = si.saleId
              WHERE si.productId = p.id
                AND s.createdAt >= ${period.start} AND s.createdAt < ${period.endExclusive}
                AND s.status = 'completed' AND (s.source IS NULL OR s.source <> 'ajuste_fiscal')
            )
          ORDER BY tiedCapital DESC, p.stock DESC
          LIMIT 15
        `),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const revenue = toDec(salesAgg._sum.total);
    const transactions = Number(salesAgg._count._all ?? 0);
    const totalCost = toDec(costRows[0]?.totalCost);
    const grossProfit = revenue.minus(totalCost);
    const uncostedRevenue = toDec(costRows[0]?.uncostedRevenue);
    const uncostedItemsCount = Number(costRows[0]?.uncostedItemsCount ?? 0);

    // 1. Horas (0..23)
    const hourMap = new Map(hourRows.map((h) => [Number(h.hour), h]));
    const byHour: HourlyMovementBucket[] = Array.from({ length: 24 }, (_, hour) => {
      const row = hourMap.get(hour);
      const rev = toDec(row?.revenue);
      const tx = Number(row?.transactions ?? 0);
      return {
        hour,
        label: `${String(hour).padStart(2, '0')}h`,
        revenue: rev.toFixed(2),
        transactions: tx,
        averageTicket: tx > 0 ? rev.div(tx).toFixed(2) : '0.00',
        sharePercent: revenue.gt(0) ? rev.div(revenue).mul(100).toFixed(2) : null,
      };
    });

    const nightRevenue = byHour
      .filter((h) => h.hour >= 18 || h.hour <= 2)
      .reduce((acc, h) => acc.plus(toDec(h.revenue)), new Prisma.Decimal(0));
    const nightRevenueSharePercent = revenue.gt(0) ? nightRevenue.div(revenue).mul(100).toFixed(2) : null;

    const peakHourBucket = byHour.reduce<HourlyMovementBucket | null>((best, curr) => {
      if (toDec(curr.revenue).lte(0)) return best;
      if (!best || toDec(curr.revenue).gt(toDec(best.revenue))) return curr;
      return best;
    }, null);

    // 2. Dias da semana (1=Domingo .. 7=Sábado)
    const weekdaySaleMap = new Map(weekdaySaleRows.map((w) => [Number(w.dayOfWeek), w]));
    const weekdayCostMap = new Map(weekdayCostRows.map((w) => [Number(w.dayOfWeek), toDec(w.totalCost)]));
    const byWeekday: WeekdayMovementBucket[] = [2, 3, 4, 5, 6, 7, 1].map((dayOfWeek) => {
      const row = weekdaySaleMap.get(dayOfWeek);
      const rev = toDec(row?.revenue);
      const cost = weekdayCostMap.get(dayOfWeek) ?? new Prisma.Decimal(0);
      const profit = rev.minus(cost);
      const tx = Number(row?.transactions ?? 0);
      return {
        dayOfWeek,
        label: WEEKDAY_LABELS[dayOfWeek],
        revenue: rev.toFixed(2),
        totalCost: cost.toFixed(2),
        grossProfit: profit.toFixed(2),
        marginPercent: computeMarginPercent(profit, rev),
        transactions: tx,
        averageTicket: tx > 0 ? rev.div(tx).toFixed(2) : '0.00',
        sharePercent: revenue.gt(0) ? rev.div(revenue).mul(100).toFixed(2) : null,
      };
    });

    const weekendRevenue = byWeekday
      .filter((w) => [6, 7, 1].includes(w.dayOfWeek))
      .reduce((acc, w) => acc.plus(toDec(w.revenue)), new Prisma.Decimal(0));
    const weekendRevenueSharePercent = revenue.gt(0) ? weekendRevenue.div(revenue).mul(100).toFixed(2) : null;

    const bestWeekdayBucket = byWeekday.reduce<WeekdayMovementBucket | null>((best, curr) => {
      if (toDec(curr.revenue).lte(0)) return best;
      if (!best || toDec(curr.revenue).gt(toDec(best.revenue))) return curr;
      return best;
    }, null);

    // 3. Mix de pagamentos
    const payMap = new Map<string, { key: string; label: string; revenue: Prisma.Decimal; transactions: number }>();
    for (const row of paymentRows) {
      const norm = normalizePaymentLabel(row.method, row.label);
      const existing = payMap.get(norm.key) ?? {
        key: norm.key,
        label: norm.label,
        revenue: new Prisma.Decimal(0),
        transactions: 0,
      };
      existing.revenue = existing.revenue.plus(toDec(row.revenue));
      existing.transactions += Number(row.transactions ?? 0);
      payMap.set(norm.key, existing);
    }
    const paymentTotal = Array.from(payMap.values()).reduce(
      (acc, p) => acc.plus(p.revenue),
      new Prisma.Decimal(0),
    );
    const paymentMix: PaymentMixBucket[] = Array.from(payMap.values())
      .sort((a, b) => Number(b.revenue.minus(a.revenue)))
      .map((p) => ({
        key: p.key,
        label: p.label,
        revenue: p.revenue.toFixed(2),
        transactions: p.transactions,
        sharePercent: paymentTotal.gt(0) ? p.revenue.div(paymentTotal).mul(100).toFixed(2) : null,
      }));

    // 4. Mix de categorias
    const itemsTotalRev = categoryRows.reduce((acc, c) => acc.plus(toDec(c.revenue)), new Prisma.Decimal(0));
    const categoryMix: CategoryMixBucket[] = categoryRows.map((c) => {
      const rev = toDec(c.revenue);
      const cost = toDec(c.totalCost);
      const profit = rev.minus(cost);
      return {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        distinctProducts: Number(c.distinctProducts ?? 0),
        quantity: toDec(c.quantity).toFixed(3),
        revenue: rev.toFixed(2),
        totalCost: cost.toFixed(2),
        grossProfit: profit.toFixed(2),
        marginPercent: computeMarginPercent(profit, rev),
        revenueSharePercent: itemsTotalRev.gt(0) ? rev.div(itemsTotalRev).mul(100).toFixed(2) : null,
      };
    });

    // 5. Ranking & quadrantes de produtos
    const mappedProducts = allProductsRankingRows.map((row, idx) =>
      this.mapRankingRow(row, idx + 1, itemsTotalRev, itemsTotalRev.minus(totalCost)),
    );

    const topProfitDrivers = [...mappedProducts]
      .filter((p) => Number(p.grossProfit) > 0)
      .sort((a, b) => Number(b.grossProfit) - Number(a.grossProfit))
      .slice(0, 8)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const highMarginOpportunities = [...mappedProducts]
      .filter(
        (p) =>
          p.marginPercent !== null &&
          Number(p.marginPercent) >= 35 &&
          p.costSource !== 'untracked' &&
          Number(p.quantity) >= 2,
      )
      .sort((a, b) => Number(b.marginPercent ?? 0) - Number(a.marginPercent ?? 0))
      .slice(0, 8)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const uncostedTopSellers = mappedProducts
      .filter((p) => p.costSource === 'untracked' || Number(p.costCoveragePercent) < 100)
      .slice(0, 10)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));

    // 6. Risco de ruptura entre itens vendidos no período
    const stockoutRisks: StockoutRiskItem[] = [];
    for (const item of mappedProducts) {
      if (item.isComposite || item.currentStock === null) continue;
      const soldQty = toDec(item.quantity);
      if (soldQty.lte(0)) continue;
      const stock = toDec(item.currentStock);
      const minStock = item.minStock !== null ? toDec(item.minStock) : null;
      const dailyVelocity = soldQty.div(period.days);
      const daysOfSupply = dailyVelocity.gt(0) && stock.gt(0) ? stock.div(dailyVelocity) : stock.lte(0) ? new Prisma.Decimal(0) : null;

      const isOut = stock.lte(0);
      const isLowVsMin = minStock !== null && stock.lte(minStock);
      const isShortRunway = daysOfSupply !== null && daysOfSupply.lte(5);

      if (isOut || isLowVsMin || isShortRunway) {
        stockoutRisks.push({
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          imageUrl: item.imageUrl,
          categoryName: item.categoryName,
          soldQuantity: soldQty.toFixed(3),
          dailyVelocity: dailyVelocity.toFixed(2),
          revenue: item.itemSubtotal,
          grossProfit: item.grossProfit,
          currentStock: stock.toFixed(3),
          minStock: minStock ? minStock.toFixed(3) : null,
          daysOfSupply: daysOfSupply ? daysOfSupply.toFixed(1) : null,
          severity: isOut || (daysOfSupply !== null && daysOfSupply.lte(2)) ? 'critical' : 'warning',
        });
      }
    }
    stockoutRisks.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      return Number(b.revenue) - Number(a.revenue);
    });

    // 7. Capital parado sem vendas no período
    const slowMovingProducts: SlowMovingProductItem[] = slowMovingRows.map((row) => ({
      productId: row.productId,
      name: row.name,
      unit: row.unit,
      imageUrl: normalizeImageUrl(row.imageUrl),
      categoryName: row.categoryName,
      currentStock: toDec(row.currentStock).toFixed(3),
      unitCost: toDec(row.unitCost).toFixed(2),
      unitPrice: toDec(row.unitPrice).toFixed(2),
      tiedCapital: toDec(row.tiedCapital).toFixed(2),
    }));
    const totalTiedCapital = slowMovingRows.reduce((acc, r) => acc.plus(toDec(r.tiedCapital)), new Prisma.Decimal(0));

    // 8. Insights estruturados para dono de adega (e futuros agentes MCP)
    const insights = this.buildAdegaInsights({
      transactions,
      revenue,
      grossProfit,
      uncostedRevenue,
      uncostedItemsCount,
      peakHourBucket,
      nightRevenueSharePercent,
      bestWeekdayBucket,
      weekendRevenueSharePercent,
      topProfitDrivers,
      categoryMix,
      stockoutRisks: stockoutRisks.slice(0, 12),
      slowMovingProducts,
      totalTiedCapital,
      paymentMix,
    });

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        days: period.days,
        timezone: period.timezone,
      },
      kpis: {
        revenue: revenue.toFixed(2),
        totalCost: totalCost.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        marginPercent: computeMarginPercent(grossProfit, revenue),
        nightRevenueSharePercent,
        weekendRevenueSharePercent,
        peakHour: peakHourBucket
          ? { hour: peakHourBucket.hour, label: peakHourBucket.label, revenue: peakHourBucket.revenue }
          : null,
        bestWeekday: bestWeekdayBucket
          ? {
              dayOfWeek: bestWeekdayBucket.dayOfWeek,
              label: bestWeekdayBucket.label,
              revenue: bestWeekdayBucket.revenue,
              grossProfit: bestWeekdayBucket.grossProfit,
            }
          : null,
        totalTiedCapitalSlowMoving: totalTiedCapital.toFixed(2),
        stockoutRisksCount: stockoutRisks.length,
      },
      byHour,
      byWeekday,
      paymentMix,
      categoryMix,
      topProfitDrivers,
      highMarginOpportunities,
      uncostedTopSellers,
      stockoutRisks: stockoutRisks.slice(0, 15),
      slowMovingProducts,
      insights,
    };
  }

  private buildAdegaInsights(params: {
    transactions: number;
    revenue: Prisma.Decimal;
    grossProfit: Prisma.Decimal;
    uncostedRevenue: Prisma.Decimal;
    uncostedItemsCount: number;
    peakHourBucket: HourlyMovementBucket | null;
    nightRevenueSharePercent: string | null;
    bestWeekdayBucket: WeekdayMovementBucket | null;
    weekendRevenueSharePercent: string | null;
    topProfitDrivers: ProductRankingItem[];
    categoryMix: CategoryMixBucket[];
    stockoutRisks: StockoutRiskItem[];
    slowMovingProducts: SlowMovingProductItem[];
    totalTiedCapital: Prisma.Decimal;
    paymentMix: PaymentMixBucket[];
  }): AdegaInsight[] {
    const insights: AdegaInsight[] = [];

    if (params.transactions === 0) {
      insights.push({
        id: 'no-sales',
        category: 'profit',
        severity: 'info',
        title: 'Nenhuma venda concluída neste intervalo',
        description: 'Amplie o período selecionado ou registre vendas no PDV para gerar o mapa de lucro e giro da adega.',
        metricLabel: 'Vendas concluídas',
        metricValue: '0',
        actionHint: 'Tente consultar os últimos 7 ou 30 dias.',
      });
      return insights;
    }

    if (params.uncostedRevenue.gt(0) || params.uncostedItemsCount > 0) {
      insights.push({
        id: 'uncosted-items',
        category: 'cost_data',
        severity: 'high',
        title: `${params.uncostedItemsCount} produto(s) vendido(s) sem custo cadastrado`,
        description: `${formatBrl(params.uncostedRevenue)} em faturamento vieram de itens com preço de custo zerado. Isso faz o lucro parecer maior do que realmente é.`,
        metricLabel: 'Receita sem custo',
        metricValue: formatBrl(params.uncostedRevenue),
        actionHint: 'Atualize o preço de custo no Catálogo/Estoque ou importe as notas XML de entrada.',
      });
    }

    if (params.stockoutRisks.length > 0) {
      const top = params.stockoutRisks[0];
      insights.push({
        id: 'stockout-risk',
        category: 'stockout',
        severity: top.severity === 'critical' ? 'high' : 'medium',
        title: `${params.stockoutRisks.length} item(ns) de venda com risco de ruptura`,
        description: `Destaque para "${top.name}": estoque atual de ${Number(top.currentStock).toLocaleString('pt-BR')} ${top.unit} com saída de ${Number(top.dailyVelocity).toLocaleString('pt-BR')}/dia.`,
        metricLabel: 'Itens em alerta',
        metricValue: `${params.stockoutRisks.length}`,
        actionHint: 'Gere pedido de compra antes do pico do fim de semana para não perder vendas.',
        productIds: params.stockoutRisks.map((r) => r.productId),
      });
    }

    if (params.topProfitDrivers.length > 0) {
      const leader = params.topProfitDrivers[0];
      insights.push({
        id: 'top-profit-driver',
        category: 'profit',
        severity: 'positive',
        title: `Campeão de lucro real: ${leader.name}`,
        description: `Gerou ${formatBrl(leader.grossProfit)} de lucro bruto (${leader.marginPercent ?? '0'}% de margem) com ${Number(leader.quantity).toLocaleString('pt-BR')} ${leader.unit} vendidos.`,
        metricLabel: 'Lucro do líder',
        metricValue: formatBrl(leader.grossProfit),
        actionHint: 'Garanta estoque refrigerado/visível deste item e use-o como âncora em combos.',
        productIds: [leader.productId],
      });
    }

    if (params.peakHourBucket) {
      const nightShare = Number(params.nightRevenueSharePercent ?? 0);
      insights.push({
        id: 'peak-hour',
        category: 'peak_hours',
        severity: 'info',
        title: `Horário nobre às ${params.peakHourBucket.label}`,
        description: `O pico de movimento foi às ${params.peakHourBucket.label} (${formatBrl(params.peakHourBucket.revenue)}). O turno noturno (18h–02h) concentra ${nightShare.toLocaleString('pt-BR')}% das vendas.`,
        metricLabel: 'Faturamento no pico',
        metricValue: formatBrl(params.peakHourBucket.revenue),
        actionHint: 'Reforce geladeira abastecida, gelo, carvão e atendimento próximo a este horário.',
      });
    }

    if (params.bestWeekdayBucket) {
      const weekendShare = Number(params.weekendRevenueSharePercent ?? 0);
      insights.push({
        id: 'best-weekday',
        category: 'weekday',
        severity: 'positive',
        title: `Melhor dia: ${params.bestWeekdayBucket.label}`,
        description: `${params.bestWeekdayBucket.label} liderou com ${formatBrl(params.bestWeekdayBucket.revenue)} e lucro estimado de ${formatBrl(params.bestWeekdayBucket.grossProfit)}. Sexta a domingo somam ${weekendShare.toLocaleString('pt-BR')}%.`,
        metricLabel: 'Receita no dia líder',
        metricValue: formatBrl(params.bestWeekdayBucket.revenue),
        actionHint: 'Programe compras e escala de equipe visando o volume de quinta a domingo.',
      });
    }

    if (params.totalTiedCapital.gt(0) && params.slowMovingProducts.length > 0) {
      insights.push({
        id: 'slow-moving-stock',
        category: 'slow_stock',
        severity: 'medium',
        title: `${formatBrl(params.totalTiedCapital)} parados em estoque sem giro`,
        description: `Identificamos ${params.slowMovingProducts.length} produto(s) ativos com estoque positivo e zero vendas no período selecionado.`,
        metricLabel: 'Capital empatado',
        metricValue: formatBrl(params.totalTiedCapital),
        actionHint: 'Crie combos casados (ex: destilado + energético/gelo) ou ação promocional para liberar caixa.',
        productIds: params.slowMovingProducts.slice(0, 5).map((p) => p.productId),
      });
    }

    if (params.paymentMix.length > 0) {
      const pixOrCash = params.paymentMix
        .filter((p) => p.key === 'pix' || p.key === 'dinheiro')
        .reduce((acc, p) => acc + Number(p.sharePercent ?? 0), 0);
      const topPay = params.paymentMix[0];
      insights.push({
        id: 'payment-mix',
        category: 'payment',
        severity: 'info',
        title: `Forma líder: ${topPay.label} (${Number(topPay.sharePercent ?? 0).toLocaleString('pt-BR')}%)`,
        description: `PIX e Dinheiro juntos representam ${pixOrCash.toFixed(1).replace('.', ',')}% do recebido, reduzindo custo com taxas de maquininha.`,
        metricLabel: topPay.label,
        metricValue: formatBrl(topPay.revenue),
        actionHint: 'Acompanhe as taxas de cartão sobre categorias de margem mais apertada (ex: cerveja caixa fechada).',
      });
    }

    return insights;
  }
}
