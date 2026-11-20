export type ProductRankingSort = 'profit' | 'revenue' | 'quantity' | 'margin' | 'cost';

export type CostSourceKind = 'historical' | 'catalog_fallback' | 'mixed' | 'untracked';

export type StockAlertStatus = 'out' | 'low' | 'ok' | 'unknown';

export interface ReportPeriodInfo {
  startDate: string;
  endDate: string;
  days: number;
  timezone: string;
  includesOpenDays?: boolean;
}

export interface DailySalesPoint {
  date: string;
  revenue: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
  transactions: number;
}

export interface PeriodComparison {
  startDate: string;
  endDate: string;
  days: number;
  revenue: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
  transactions: number;
  averageTicket: string;
  revenueDifference: string;
  revenueChangePercent: string | null;
  grossProfitDifference: string;
  grossProfitChangePercent: string | null;
  includesOpenDays: boolean;
}

export interface SalesSummaryMetrics {
  revenue: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
  markupPercent: string | null;
  itemsSubtotal: string;
  saleDiscounts: string;
  saleAdditions: string;
  transactions: number;
  averageTicket: string;
  averageProfitPerSale: string;
  costCoveragePercent: string;
  historicalCostRevenue: string;
  fallbackCostRevenue: string;
  uncostedRevenue: string;
  uncostedItemsCount: number;
}

export interface SalesTopProductItem {
  productId: string;
  name: string;
  unit: string;
  quantity: string;
  itemSubtotal: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
}

export interface UncostedProductItem {
  productId: string;
  name: string;
  unit: string;
  quantity: string;
  itemSubtotal: string;
}

export interface SalesReportResponse {
  period: ReportPeriodInfo;
  daily: DailySalesPoint[];
  comparison: PeriodComparison;
  summary: SalesSummaryMetrics;
  productLimit: number;
  products: SalesTopProductItem[];
  uncostedProducts: UncostedProductItem[];
}

export interface ProductRankingQuery {
  startDate: unknown;
  endDate: unknown;
  sortBy?: unknown;
  categoryId?: unknown;
  search?: unknown;
  limit?: unknown;
}

export interface ProductRankingItem {
  rank: number;
  productId: string;
  name: string;
  unit: string;
  categoryId: string | null;
  categoryName: string;
  salesCount: number;
  quantity: string;
  avgSalePrice: string;
  avgUnitCost: string;
  itemSubtotal: string;
  revenueSharePercent: string | null;
  totalCost: string;
  grossProfit: string;
  profitSharePercent: string | null;
  marginPercent: string | null;
  markupPercent: string | null;
  costCoveragePercent: string;
  costSource: CostSourceKind;
  currentStock: string | null;
  minStock: string | null;
  isComposite: boolean;
  stockAlert: StockAlertStatus;
}

export interface ProductRankingResponse {
  period: ReportPeriodInfo;
  filters: {
    sortBy: ProductRankingSort;
    categoryId: string | null;
    search: string | null;
    limit: number;
  };
  totals: {
    distinctProducts: number;
    totalUnitsSold: string;
    totalRevenue: string;
    totalCost: string;
    totalGrossProfit: string;
    averageMarginPercent: string | null;
    uncostedInPeriodCount: number;
    uncostedInPeriodRevenue: string;
    uncostedCatalogCount: number;
  };
  categories: { id: string; name: string }[];
  items: ProductRankingItem[];
}

export type UncostedScope = 'period' | 'catalog';

export interface UncostedProductEditorItem {
  productId: string;
  name: string;
  shortCode: string | null;
  barcode: string | null;
  unit: string;
  categoryId: string | null;
  categoryName: string;
  priceSell: string;
  priceCost: string;
  currentStock: string | null;
  isComposite: boolean;
  soldQuantity: string;
  itemSubtotal: string;
  salesCount: number;
}

export interface UncostedProductsResponse {
  period: ReportPeriodInfo;
  scope: UncostedScope;
  counts: {
    inPeriod: number;
    catalog: number;
  };
  categories: { id: string; name: string }[];
  items: UncostedProductEditorItem[];
}

export interface UpdateProductCostItem {
  productId: string;
  priceCost: number;
}

export interface UpdateProductCostsResponse {
  updatedCount: number;
  notFoundIds: string[];
}

export interface HourlyMovementBucket {
  hour: number;
  label: string;
  revenue: string;
  transactions: number;
  averageTicket: string;
  sharePercent: string | null;
}

export interface WeekdayMovementBucket {
  dayOfWeek: number;
  label: string;
  revenue: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
  transactions: number;
  averageTicket: string;
  sharePercent: string | null;
}

export interface PaymentMixBucket {
  key: string;
  label: string;
  revenue: string;
  transactions: number;
  sharePercent: string | null;
}

export interface CategoryMixBucket {
  categoryId: string | null;
  categoryName: string;
  distinctProducts: number;
  quantity: string;
  revenue: string;
  totalCost: string;
  grossProfit: string;
  marginPercent: string | null;
  revenueSharePercent: string | null;
}

export interface StockoutRiskItem {
  productId: string;
  name: string;
  unit: string;
  categoryName: string;
  soldQuantity: string;
  dailyVelocity: string;
  revenue: string;
  grossProfit: string;
  currentStock: string;
  minStock: string | null;
  daysOfSupply: string | null;
  severity: 'critical' | 'warning';
}

export interface SlowMovingProductItem {
  productId: string;
  name: string;
  unit: string;
  categoryName: string;
  currentStock: string;
  unitCost: string;
  unitPrice: string;
  tiedCapital: string;
}

export interface AdegaInsight {
  id: string;
  category: 'profit' | 'peak_hours' | 'weekday' | 'stockout' | 'slow_stock' | 'payment' | 'cost_data';
  severity: 'high' | 'medium' | 'positive' | 'info';
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  actionHint: string;
  productIds?: string[];
}

export interface AdegaInsightsResponse {
  period: ReportPeriodInfo;
  kpis: {
    revenue: string;
    totalCost: string;
    grossProfit: string;
    marginPercent: string | null;
    nightRevenueSharePercent: string | null;
    weekendRevenueSharePercent: string | null;
    peakHour: { hour: number; label: string; revenue: string } | null;
    bestWeekday: { dayOfWeek: number; label: string; revenue: string; grossProfit: string } | null;
    totalTiedCapitalSlowMoving: string;
    stockoutRisksCount: number;
  };
  byHour: HourlyMovementBucket[];
  byWeekday: WeekdayMovementBucket[];
  paymentMix: PaymentMixBucket[];
  categoryMix: CategoryMixBucket[];
  topProfitDrivers: ProductRankingItem[];
  highMarginOpportunities: ProductRankingItem[];
  uncostedTopSellers: ProductRankingItem[];
  stockoutRisks: StockoutRiskItem[];
  slowMovingProducts: SlowMovingProductItem[];
  insights: AdegaInsight[];
}

/**
 * Contratos tipados para expor este modulo via servidor MCP futuramente
 * (ex: @modelcontextprotocol/sdk), reutilizando ReportsService sem camada HTTP.
 */
export const REPORTS_MCP_TOOLS = [
  {
    name: 'pdv_report_sales_profit',
    description:
      'Retorna faturamento liquido, CMV (custo das mercadorias vendidas), lucro bruto real, margem %, cobertura de custo e evolucao diaria vs periodo anterior no fuso UTC-03:00.',
    inputSchema: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', description: 'Data inicial AAAA-MM-DD (UTC-03:00).' },
        endDate: { type: 'string', description: 'Data final AAAA-MM-DD (ate 92 dias apos startDate).' },
      },
    },
  },
  {
    name: 'pdv_report_products_ranking',
    description:
      'Retorna o ranking detalhado de produtos por lucro real, faturamento, quantidade, margem % ou custo, com estoque atual e origem do custo.',
    inputSchema: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', description: 'Data inicial AAAA-MM-DD.' },
        endDate: { type: 'string', description: 'Data final AAAA-MM-DD.' },
        sortBy: { type: 'string', enum: ['profit', 'revenue', 'quantity', 'margin', 'cost'] },
        categoryId: { type: 'string', description: 'ID opcional da categoria.' },
        search: { type: 'string', description: 'Filtro opcional por nome do produto.' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: 'pdv_report_adega_insights',
    description:
      'Retorna insights acionaveis para dono de adega: horarios de pico, melhores dias da semana, mix de pagamentos e categorias, risco de ruptura nos campeoes de venda e capital parado.',
    inputSchema: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', description: 'Data inicial AAAA-MM-DD.' },
        endDate: { type: 'string', description: 'Data final AAAA-MM-DD.' },
      },
    },
  },
] as const;
