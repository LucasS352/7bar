import './adega-insights.css';
import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  CreditCard,
  Info,
  Moon,
  Package,
  PackageX,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { InfoBalloon } from '@/components/InfoBalloon';
import { ProductThumb } from '@/components/ProductThumb';

export interface ProductRankingRow {
  rank: number;
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
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
  costSource: 'historical' | 'catalog_fallback' | 'mixed' | 'untracked';
  currentStock: string | null;
  minStock: string | null;
  isComposite: boolean;
  stockAlert: 'out' | 'low' | 'ok' | 'unknown';
}

export interface AdegaInsightsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
    timezone: string;
  };
  kpis: {
    revenue: string;
    totalCost: string;
    grossProfit: string;
    marginPercent: string | null;
    nightRevenueSharePercent: string | null;
    weekendRevenueSharePercent: string | null;
    peakHour: { hour: number; label: string; revenue: string } | null;
    bestWeekday: {
      dayOfWeek: number;
      label: string;
      revenue: string;
      grossProfit: string;
    } | null;
    totalTiedCapitalSlowMoving: string;
    stockoutRisksCount: number;
    slowMovingCount: number;
    transactions: number;
    averageTicket: string;
    costCoveragePercent: string | null;
    uncostedItemsCount: number;
  };
  byHour: {
    hour: number;
    label: string;
    revenue: string;
    transactions: number;
    averageTicket: string;
    sharePercent: string | null;
  }[];
  byWeekday: {
    dayOfWeek: number;
    label: string;
    revenue: string;
    totalCost: string;
    grossProfit: string;
    marginPercent: string | null;
    transactions: number;
    averageTicket: string;
    sharePercent: string | null;
  }[];
  paymentMix: {
    key: string;
    label: string;
    revenue: string;
    transactions: number;
    sharePercent: string | null;
  }[];
  categoryMix: {
    categoryId: string | null;
    categoryName: string;
    distinctProducts: number;
    quantity: string;
    revenue: string;
    totalCost: string;
    grossProfit: string;
    marginPercent: string | null;
    revenueSharePercent: string | null;
  }[];
  topProfitDrivers: ProductRankingRow[];
  highMarginOpportunities: ProductRankingRow[];
  uncostedTopSellers: ProductRankingRow[];
  stockoutRisks: {
    productId: string;
    name: string;
    unit: string;
    imageUrl?: string | null;
    categoryName: string;
    soldQuantity: string;
    dailyVelocity: string;
    revenue: string;
    grossProfit: string;
    currentStock: string;
    minStock: string | null;
    daysOfSupply: string | null;
    severity: 'critical' | 'warning';
  }[];
  slowMovingProducts: {
    productId: string;
    name: string;
    unit: string;
    imageUrl?: string | null;
    categoryName: string;
    currentStock: string;
    unitCost: string;
    unitPrice: string;
    tiedCapital: string;
    lastSaleAt: string | null;
  }[];
  insights: {
    id: string;
    category: string;
    severity: 'high' | 'medium' | 'positive' | 'info';
    title: string;
    description: string;
    metricLabel: string;
    metricValue: string;
    actionHint: string;
  }[];
}

interface AdegaInsightsPanelProps {
  data: AdegaInsightsData;
  includeStock: boolean;
  onStockChange: (value: boolean) => void;
  financial: {
    summary: {
      transactions: number;
      averageTicket: string;
      costCoveragePercent: string;
      uncostedItemsCount: number;
    };
    comparison: {
      startDate: string;
      endDate: string;
      revenueChangePercent: string | null;
      grossProfitChangePercent?: string | null;
      averageTicket: string;
    };
  } | null;
  onOpenCostEditor?: (search?: string) => void;
  onGoToRanking?: (sortBy?: 'profit' | 'margin' | 'revenue') => void;
}

const money = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const num = (v: string | number | null | undefined, maxDecimals = 2) =>
  Number(v ?? 0).toLocaleString('pt-BR', {
    maximumFractionDigits: maxDecimals,
  });

const PRIORITY_CATEGORIES = new Set(['cost_data', 'stockout', 'slow_stock']);
const OPPORTUNITY_IDS = new Set(['top-profit-driver', 'peak-hour', 'best-weekday', 'payment-mix']);

export function AdegaInsightsPanel({
  data,
  financial,
  includeStock,
  onStockChange,
  onOpenCostEditor,
  onGoToRanking,
}: AdegaInsightsPanelProps) {
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showAllStockout, setShowAllStockout] = useState(false);
  const [showAllSlow, setShowAllSlow] = useState(false);

  const peakHourNumber = data.kpis.peakHour?.hour ?? null;
  const hourlyChart = data.byHour.map((h) => ({
    label: h.label,
    hour: h.hour,
    revenueNum: Number(h.revenue),
    transactions: h.transactions,
    averageTicket: Number(h.averageTicket),
    isPeak: peakHourNumber !== null && h.hour === peakHourNumber && Number(h.revenue) > 0,
  }));

  const visibleInsights = data.insights.filter((i) => includeStock || !['stockout', 'slow_stock'].includes(i.category));
  const priorityInsights = visibleInsights.filter(
    (i) => PRIORITY_CATEGORIES.has(i.category) || i.severity === 'high' || i.id === 'negative-or-low-profit',
  );
  const extraInsights = visibleInsights.filter(
    (i) => !priorityInsights.some((p) => p.id === i.id) && !OPPORTUNITY_IDS.has(i.id),
  );

  const topProfitInsight = data.insights.find((i) => i.id === 'top-profit-driver');
  const peakHourInsight = data.insights.find((i) => i.id === 'peak-hour');
  const bestWeekdayInsight = data.insights.find((i) => i.id === 'best-weekday');
  const paymentInsight = data.insights.find((i) => i.id === 'payment-mix');

  const topLeaderProduct = data.topProfitDrivers[0] ?? null;
  const topPayment = data.paymentMix[0] ?? null;
  const primaryPayments = data.paymentMix.slice(0, 4);
  const extraPayments = data.paymentMix.slice(4);
  const extraPaymentsSum = extraPayments.reduce((acc, p) => acc + Number(p.revenue), 0);
  const extraPaymentsShare = extraPayments.reduce((acc, p) => acc + Number(p.sharePercent ?? 0), 0);

  const visibleStockout = showAllStockout ? data.stockoutRisks : data.stockoutRisks.slice(0, 5);
  const visibleSlow = showAllSlow ? data.slowMovingProducts : data.slowMovingProducts.slice(0, 5);

  const scrollToSection = (elementId: string, expand?: () => void) => {
    expand?.();
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  return (
    <div className="adega-insights space-y-6">
      {/* 1. PANORAMA ESTRATÉGICO */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Compass size={17} className="text-sky-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">Panorama estratégico</h2>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={includeStock} onChange={(event) => onStockChange(event.target.checked)} />
          Usar saldos de estoque conferidos para analisar ruptura e capital parado
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 shrink-0">
                  <Moon size={13} />
                </span>
                <span className="truncate font-medium">Vendas no turno noturno</span>
              </p>
              <InfoBalloon
                align="left"
                title="Turno Noturno (18h–02h)"
                description="Percentual do faturamento da adega gerado entre 18h e 02h59 (UTC−03:00), destacando o horário de maior movimento."
              />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-2.5 tabular-nums">
              {data.kpis.nightRevenueSharePercent !== null ? `${num(data.kpis.nightRevenueSharePercent, 1)}%` : '—'}
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 truncate">
              {data.kpis.peakHour
                ? `Pico às ${data.kpis.peakHour.label} (${money(data.kpis.peakHour.revenue)})`
                : 'Sem pico no período'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-400 shrink-0">
                  <Calendar size={13} />
                </span>
                <span className="truncate font-medium">Faturamento no fim de semana</span>
              </p>
              <InfoBalloon
                align="right"
                title="Fim de Semana (Sex–Dom)"
                description="Participação de sexta-feira a domingo na receita total e o dia da semana campeão de faturamento."
              />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-white mt-2.5 tabular-nums">
              {data.kpis.weekendRevenueSharePercent !== null ? `${num(data.kpis.weekendRevenueSharePercent, 1)}%` : '—'}
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 truncate">
              {data.kpis.bestWeekday ? `${data.kpis.bestWeekday.label} é o melhor dia` : 'Sem vendas no período'}
            </p>
          </div>

          {!includeStock && (
            <>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-400">Faturamento do período</p>
                <p className="mt-2 text-xl font-bold text-white">{money(data.kpis.revenue)}</p>
                <p className="text-xs text-zinc-400">{num(data.kpis.transactions)} vendas</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-400">Lucro bruto apurado</p>
                <p className="mt-2 text-xl font-bold text-emerald-400">{money(data.kpis.grossProfit)}</p>
                <p className="text-xs text-zinc-400">{data.kpis.marginPercent === null ? 'Sem margem' : `${num(data.kpis.marginPercent)}% de margem`}</p>
              </div>
            </>
          )}
          {includeStock && (
            <>
              <div className="bg-gradient-to-br from-rose-950/35 via-zinc-900/95 to-zinc-950/90 border border-rose-500/30 rounded-2xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[11px] sm:text-xs text-rose-200/90 flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                      <AlertTriangle size={13} />
                    </span>
                    <span className="truncate font-medium">Produtos em risco</span>
                  </p>
                  <InfoBalloon
                    align="left"
                    title="Itens em Risco de Ruptura"
                    description="Quantidade de produtos com venda no período cujo estoque zerou, ficou abaixo do mínimo ou dura até 5 dias no ritmo atual."
                  />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-rose-400 mt-2.5 tabular-nums">
                  {data.kpis.stockoutRisksCount}
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Estoque para até 5 dias</p>
              </div>

              <div className="bg-gradient-to-br from-amber-950/30 via-zinc-900/95 to-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[11px] sm:text-xs text-zinc-300 flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 shrink-0">
                      <PackageX size={13} />
                    </span>
                    <span className="truncate font-medium">Capital sem giro</span>
                  </p>
                  <InfoBalloon
                    align="right"
                    title="Capital Parado (Sem Giro)"
                    description="Soma do valor de custo em estoque de produtos ativos que não tiveram nenhuma venda no período selecionado."
                    formula="Σ (estoque atual × custo unitário)"
                  />
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-2.5 truncate tabular-nums">
                  {money(data.kpis.totalTiedCapitalSlowMoving)}
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 truncate">
                  {data.kpis.slowMovingCount}{' '}
                  {data.kpis.slowMovingCount === 1 ? 'produto sem vendas' : 'produtos sem vendas'}
                </p>
              </div>
            </>
          )}
        </div>
        <details className="financial-details">
          <summary>Indicadores financeiros do período</summary>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Faturamento', money(data.kpis.revenue)],
            ['Lucro bruto' + (data.kpis.uncostedItemsCount ? ' (parcial)' : ''), money(data.kpis.grossProfit)],
            ['Margem bruta', data.kpis.marginPercent === null ? '—' : num(data.kpis.marginPercent) + '%'],
            ['CMV apurado', money(data.kpis.totalCost)],
            ['Vendas', num(data.kpis.transactions)],
            ['Ticket médio', money(data.kpis.averageTicket)],
            [
              'Receita dos itens com custo conhecido',
              data.kpis.costCoveragePercent === null ? '—' : num(data.kpis.costCoveragePercent) + '%',
            ],
            ...(financial ? [['Ticket médio anterior', money(financial.comparison.averageTicket)]] : []),
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-xs text-zinc-400">{label}</p>
              <p className="mt-1 font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
        {financial && (
          <p className="text-xs text-zinc-400">
            Comparação com {financial.comparison.startDate.split('-').reverse().join('/')} a{' '}
            {financial.comparison.endDate.split('-').reverse().join('/')} · Faturamento{' '}
            {financial.comparison.revenueChangePercent === null
              ? 'sem base percentual'
              : num(financial.comparison.revenueChangePercent) + '%'}{' '}
            · Lucro bruto{' '}
            {financial.comparison.grossProfitChangePercent == null
              ? 'sem base percentual'
              : num(financial.comparison.grossProfitChangePercent) + '%'}
            .
          </p>
        )}
        {data.kpis.uncostedItemsCount > 0 && (
          <p className="text-xs text-amber-300">
            Há custos pendentes em {data.kpis.uncostedItemsCount} produto(s). O lucro bruto e as margens podem estar
            superestimados.
          </p>
        )}
        </details>
      </section>

      {/* 2. PRIORIDADES QUE MERECEM ATENÇÃO */}
      {priorityInsights.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={17} className="text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Prioridades que merecem atenção</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {priorityInsights.map((insight) => {
              const isHigh =
                insight.severity === 'high' || insight.category === 'cost_data' || insight.category === 'stockout';
              const actionConfig = (() => {
                if (insight.category === 'cost_data') {
                  return {
                    label: 'Corrigir custos',
                    onClick: () => onOpenCostEditor?.(),
                  };
                }
                if (insight.category === 'stockout') {
                  return {
                    label: 'Planejar reposição',
                    onClick: () => scrollToSection('secao-ruptura', () => setShowAllStockout(true)),
                  };
                }
                if (insight.category === 'slow_stock') {
                  return {
                    label: 'Ver produtos',
                    onClick: () => scrollToSection('secao-capital-parado', () => setShowAllSlow(true)),
                  };
                }
                return null;
              })();

              return (
                <div
                  key={insight.id}
                  className={`rounded-2xl border bg-gradient-to-br from-zinc-900/95 to-zinc-950/90 p-4 flex flex-col justify-between gap-3 border-l-2 ${
                    isHigh ? 'border-zinc-800/90 border-l-rose-500' : 'border-zinc-800/90 border-l-amber-500'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span
                          className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${
                            isHigh
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          }`}
                        >
                          {insight.category === 'slow_stock' ? <Package size={14} /> : <AlertTriangle size={14} />}
                        </span>
                        <h3 className="font-bold text-sm text-white leading-snug">{insight.title}</h3>
                      </div>
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isHigh ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {insight.metricValue}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed pl-8">{insight.description}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed pl-8">{insight.actionHint}</p>
                  </div>

                  {actionConfig && (
                    <div className="pl-8 pt-1">
                      <button
                        type="button"
                        onClick={actionConfig.onClick}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>{actionConfig.label}</span>
                        <span aria-hidden="true">&rarr;</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. OPORTUNIDADES DE CRESCIMENTO */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Oportunidades de crescimento</h2>
          </div>

          {topPayment && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <CreditCard size={13} className="text-sky-400 shrink-0" />
              <span className="text-zinc-400">Forma mais usada:</span>
              <strong className="text-white">
                {topPayment.label} {topPayment.sharePercent !== null ? `${num(topPayment.sharePercent, 2)}%` : ''}
              </strong>
              {paymentInsight && (
                <InfoBalloon
                  align="right"
                  title={paymentInsight.title}
                  description={`${paymentInsight.description} ${paymentInsight.actionHint}`}
                />
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Produto Destaque */}
          <div className="rounded-2xl border border-emerald-500/20 border-l-2 border-l-emerald-500/80 bg-gradient-to-br from-emerald-950/20 via-zinc-900/95 to-zinc-950/90 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {topLeaderProduct ? (
                  <ProductThumb src={topLeaderProduct.imageUrl} alt={topLeaderProduct.name} size="sm" />
                ) : (
                  <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
                    <Award size={15} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                    <Award size={12} className="text-emerald-400 shrink-0" /> Produto destaque:
                  </p>
                  <p className="font-bold text-sm text-white truncate">
                    {topLeaderProduct ? topLeaderProduct.name : 'Sem produto líder'}
                  </p>
                </div>
              </div>
              {topProfitInsight && (
                <InfoBalloon
                  align="left"
                  title={topProfitInsight.title}
                  description={`${topProfitInsight.description} ${topProfitInsight.actionHint}`}
                />
              )}
            </div>

            <div>
              <p className="text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums">
                {topLeaderProduct ? `${money(topLeaderProduct.grossProfit)} em lucro` : '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {topLeaderProduct
                  ? `${num(topLeaderProduct.quantity, 2)} ${topLeaderProduct.unit} · ${
                      topLeaderProduct.marginPercent !== null
                        ? `${num(topLeaderProduct.marginPercent, 2)}% de margem`
                        : 'sem margem calculada'
                    }.`
                  : 'Registre vendas no período para identificar o campeão de lucro.'}
              </p>
            </div>
          </div>

          {/* Card 2: Horário de Pico */}
          <div className="rounded-2xl border border-emerald-500/20 border-l-2 border-l-sky-500/80 bg-gradient-to-br from-sky-950/20 via-zinc-900/95 to-zinc-950/90 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 shrink-0">
                  <Clock size={15} />
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 font-medium truncate">
                  Horário de pico:{' '}
                  <strong className="text-white">{data.kpis.peakHour ? data.kpis.peakHour.label : '—'}</strong>
                </p>
              </div>
              {peakHourInsight && (
                <InfoBalloon
                  align="right"
                  title={peakHourInsight.title}
                  description={`${peakHourInsight.description} ${peakHourInsight.actionHint}`}
                />
              )}
            </div>

            <div>
              <p className="text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums">
                {data.kpis.peakHour ? `${money(data.kpis.peakHour.revenue)} em vendas` : '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {data.kpis.nightRevenueSharePercent !== null
                  ? `Turno noturno (18h–02h) concentra ${num(data.kpis.nightRevenueSharePercent, 2)}% das vendas.`
                  : 'Sem histórico de horários neste período.'}
              </p>
            </div>
          </div>

          {/* Card 3: Melhor Dia */}
          <div className="rounded-2xl border border-emerald-500/20 border-l-2 border-l-emerald-500/80 bg-gradient-to-br from-emerald-950/20 via-zinc-900/95 to-zinc-950/90 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
                  <Calendar size={15} />
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 font-medium truncate">
                  Melhor dia:{' '}
                  <strong className="text-white">
                    {data.kpis.bestWeekday ? data.kpis.bestWeekday.label.toLowerCase() : '—'}
                  </strong>
                </p>
              </div>
              {bestWeekdayInsight && (
                <InfoBalloon
                  align="right"
                  title={bestWeekdayInsight.title}
                  description={`${bestWeekdayInsight.description} ${bestWeekdayInsight.actionHint}`}
                />
              )}
            </div>

            <div>
              <p className="text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums">
                {data.kpis.bestWeekday ? `${money(data.kpis.bestWeekday.revenue)} faturados` : '—'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {data.kpis.bestWeekday
                  ? `Lucro de ${money(data.kpis.bestWeekday.grossProfit)} · Sex–Dom somam ${num(
                      data.kpis.weekendRevenueSharePercent ?? 0,
                      2,
                    )}%.`
                  : 'Sem dias faturados no período.'}
              </p>
            </div>
          </div>
        </div>

        {/* Outros insights extras caso o backend retorne categorias adicionais */}
        {extraInsights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {extraInsights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/85 p-3.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate">{insight.title}</span>
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{insight.description}</p>
                  <p className="text-[11px] text-zinc-400">{insight.actionHint}</p>
                </div>
                <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300">
                  {insight.metricValue}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. COMPORTAMENTO DAS VENDAS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={17} className="text-sky-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">Comportamento das vendas</h2>
        </div>

        {/* Linha A: Movimento por horário + Desempenho por dia da semana */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-sky-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">Movimento por horário</h3>
                  <InfoBalloon
                    align="left"
                    title="Mapa de Horários (00h–23h · BRT)"
                    description="Distribuição hora a hora do faturamento no horário de Brasília. A barra azul destaca automaticamente o seu horário de pico."
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Faturamento horário no período (UTC−03:00).</p>
              </div>

              {data.kpis.peakHour && (
                <div className="shrink-0 px-2.5 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-right">
                  <p className="text-[10px] font-semibold text-sky-300 leading-none">{data.kpis.peakHour.label}</p>
                  <p className="text-xs font-extrabold text-white mt-0.5 tabular-nums">
                    {money(data.kpis.peakHour.revenue)}
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
              <div className="min-w-[460px] sm:min-w-0">
                <ResponsiveContainer width="100%" height={235}>
                  <BarChart data={hourlyChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 10 }} interval={1} />
                    <YAxis
                      width={52}
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      tickFormatter={(v) =>
                        Number(v).toLocaleString('pt-BR', {
                          notation: 'compact',
                        })
                      }
                    />
                    <Tooltip
                      formatter={(value) => [money(Number(value ?? 0)), 'Faturamento']}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload as { transactions?: number } | undefined;
                        return row ? `${label} · ${row.transactions ?? 0} vendas` : String(label);
                      }}
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 12,
                      }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                      cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    />
                    <Bar dataKey="revenueNum" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {hourlyChart.map((entry) => (
                        <Cell key={`hour-${entry.hour}`} fill={entry.isPeak ? '#3b82f6' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-sky-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Desempenho por dia da semana</h3>
              </div>
              <InfoBalloon
                align="right"
                title="Desempenho por Dia da Semana"
                description="Agrupa vendas, faturamento, lucro bruto apurado e margem por dia da semana no período selecionado, destacando o melhor dia em azul."
              />
            </div>

            <div className="sm:hidden divide-y divide-zinc-800/70">
              {data.byWeekday.map((day) => {
                const isBest = data.kpis.bestWeekday?.dayOfWeek === day.dayOfWeek && Number(day.revenue) > 0;
                return (
                  <div
                    key={day.dayOfWeek}
                    className={`p-3.5 flex items-center justify-between gap-2 ${isBest ? 'bg-blue-600/15' : ''}`}
                  >
                    <div>
                      <p className="font-semibold text-white text-sm flex items-center gap-2">
                        <span>{day.label}</span>
                        {isBest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/25 text-sky-300 font-bold">
                            Líder
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {day.transactions} vendas · Fat. {money(day.revenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400 text-sm">{money(day.grossProfit)}</p>
                      <p className="text-[11px] text-zinc-400">
                        {day.marginPercent !== null ? `${num(day.marginPercent, 1)}% margem` : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 bg-zinc-950/40">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Dia</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Vendas</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Faturamento</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Lucro</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byWeekday.map((day) => {
                    const isBest = data.kpis.bestWeekday?.dayOfWeek === day.dayOfWeek && Number(day.revenue) > 0;
                    return (
                      <tr
                        key={day.dayOfWeek}
                        className={`border-t border-zinc-800/70 transition-colors ${
                          isBest ? 'bg-blue-600/20 hover:bg-blue-600/25' : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        <td className={`py-2.5 px-4 font-medium ${isBest ? 'text-white font-bold' : 'text-zinc-200'}`}>
                          {day.label}
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-300 tabular-nums">{day.transactions}</td>
                        <td className="py-2.5 px-3 text-right text-white font-semibold tabular-nums">
                          {money(day.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold tabular-nums">
                          {money(day.grossProfit)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">
                          {day.marginPercent !== null ? `${num(day.marginPercent, 1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Linha B: Rentabilidade por categoria + Mix de pagamentos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Rentabilidade por categoria</h3>
              </div>
              <InfoBalloon
                align="right"
                title="Rentabilidade por Categoria"
                description="Compara receita, CMV, lucro bruto apurado e margem (%) entre cada categoria de produtos da sua adega."
              />
            </div>

            {data.categoryMix.length === 0 ? (
              <p className="p-5 text-sm text-zinc-400">Sem categorias vendidas no período.</p>
            ) : (
              <>
                <div className="sm:hidden divide-y divide-zinc-800/70">
                  {data.categoryMix.map((cat) => (
                    <div key={cat.categoryId ?? cat.categoryName} className="p-3.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white text-sm">{cat.categoryName}</p>
                          <p className="text-[11px] text-zinc-400">
                            {num(cat.quantity, 2)} un · {cat.revenueSharePercent ?? '0'}% do total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-400 text-sm">{money(cat.grossProfit)}</p>
                          <p className="text-[11px] text-zinc-400">
                            {cat.marginPercent !== null ? `${num(cat.marginPercent, 1)}%` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>
                          Receita: <strong className="text-white">{money(cat.revenue)}</strong>
                        </span>
                        <span>
                          CMV: <strong className="text-amber-300">{money(cat.totalCost)}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 bg-zinc-950/40">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Categoria</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Receita</th>
                        <th className="py-2.5 px-3 text-right font-semibold">CMV</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Lucro</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categoryMix.map((cat) => (
                        <tr
                          key={cat.categoryId ?? cat.categoryName}
                          className="border-t border-zinc-800/70 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-white">{cat.categoryName}</p>
                            <p className="text-xs text-zinc-400">
                              {num(cat.quantity, 2)} un · {cat.revenueSharePercent ?? '0'}% do total
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-right text-white font-medium tabular-nums">
                            {money(cat.revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-300 tabular-nums">{money(cat.totalCost)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400 tabular-nums">
                            {money(cat.grossProfit)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-zinc-200 tabular-nums">
                            {cat.marginPercent !== null ? `${num(cat.marginPercent, 1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-sky-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Mix de pagamentos</h3>
              </div>
              <InfoBalloon
                align="right"
                title="Mix de Pagamentos"
                description="Distribuição do valor recebido por forma de pagamento (PIX, Dinheiro, Débito, Crédito e outras) para acompanhar taxas de cartão."
              />
            </div>

            {data.paymentMix.length === 0 ? (
              <p className="text-sm text-zinc-400">Nenhum pagamento registrado neste intervalo.</p>
            ) : (
              <div className="space-y-3">
                {primaryPayments.map((pay) => {
                  const pct = Number(pay.sharePercent ?? 0);
                  return (
                    <div key={pay.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                        <span className="font-semibold text-zinc-200 truncate">
                          {pay.label} <span className="text-xs font-normal text-zinc-500">({pay.transactions} v)</span>
                        </span>
                        <span className="font-bold text-white shrink-0 tabular-nums">
                          {money(pay.revenue)}{' '}
                          <span className="text-xs font-normal text-zinc-400">({num(pct, 1)}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800/90 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(2, pct))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {extraPayments.length > 0 && (
                  <div className="pt-1 border-t border-zinc-800/80 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAllPayments((v) => !v)}
                      className="w-full flex items-center justify-between text-xs text-zinc-300 hover:text-white py-1 cursor-pointer transition"
                    >
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span>
                          Outros ({extraPayments.length} {extraPayments.length === 1 ? 'forma' : 'formas'})
                        </span>
                        {showAllPayments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                      <span className="font-bold text-white tabular-nums">
                        {money(extraPaymentsSum)}{' '}
                        <span className="font-normal text-zinc-400">({num(extraPaymentsShare, 1)}%)</span>
                      </span>
                    </button>

                    {showAllPayments && (
                      <div className="space-y-2.5 pl-2 border-l border-zinc-800">
                        {extraPayments.map((pay) => {
                          const pct = Number(pay.sharePercent ?? 0);
                          return (
                            <div key={pay.key} className="space-y-1">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="text-zinc-300 truncate">
                                  {pay.label} <span className="text-zinc-500">({pay.transactions} v)</span>
                                </span>
                                <span className="font-semibold text-white shrink-0 tabular-nums">
                                  {money(pay.revenue)}{' '}
                                  <span className="font-normal text-zinc-400">({num(pct, 1)}%)</span>
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full bg-sky-500/80 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(2, pct))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>

      {/* 5. PRODUTOS E ESTOQUE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package size={17} className="text-sky-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">Produtos e estoque</h2>
        </div>

        {/* Maiores geradores de lucro vs Produtos de alta margem */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-white">Maiores geradores de lucro</h3>
                <InfoBalloon
                  align="left"
                  title="Maiores Geradores de Lucro (R$)"
                  description="Produtos que mais colocaram dinheiro líquido no caixa no período selecionado, já descontando o CMV de cada item."
                />
              </div>

              {onGoToRanking && (
                <button
                  type="button"
                  onClick={() => onGoToRanking('profit')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer"
                >
                  Ver todos &rarr;
                </button>
              )}
            </div>

            {data.topProfitDrivers.length === 0 ? (
              <p className="p-5 text-sm text-zinc-400">Sem produtos com lucro calculado.</p>
            ) : (
              <div className="divide-y divide-zinc-800/70">
                {data.topProfitDrivers.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-800/25 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-zinc-400 w-5 text-center shrink-0 tabular-nums">
                        {item.rank}
                      </span>
                      <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                        <p className="text-xs text-zinc-400 truncate">
                          {num(item.quantity, 2)} {item.unit} · Receita {money(item.itemSubtotal)} · CMV{' '}
                          {money(item.totalCost)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <p className="font-bold text-emerald-400 text-sm">{money(item.grossProfit)}</p>
                      <p className="text-[11px] text-zinc-400">
                        {item.marginPercent !== null ? `${num(item.marginPercent, 1)}% margem` : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white">Produtos de alta margem (&ge; 35%)</h3>
                  <InfoBalloon
                    align="right"
                    title="Produtos de Alta Margem"
                    description="Itens com maior percentual de margem sobre o preço de venda — ótimos candidatos para combos e destaque na geladeira."
                  />
                </div>

                {onGoToRanking && (
                  <button
                    type="button"
                    onClick={() => onGoToRanking('margin')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer"
                  >
                    Ver todos &rarr;
                  </button>
                )}
              </div>

              {data.highMarginOpportunities.length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">
                  Nenhum item com custo cadastrado atingiu margem &ge; 35% com ao menos 2 unidades vendidas.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800/70">
                  {data.highMarginOpportunities.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-800/25 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {item.categoryName} · {num(item.quantity, 2)} {item.unit} vendidos
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="font-extrabold text-amber-300 text-sm">{num(item.marginPercent, 1)}%</p>
                        <p className="text-[11px] text-emerald-400">Lucro {money(item.grossProfit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950/40 text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Info size={13} className="text-zinc-500 shrink-0" />
              <span>Amostra: produtos com custo cadastrado e &ge; 2 unidades vendidas no período.</span>
            </div>
          </section>
        </div>

        {/* Risco de Ruptura & Capital Parado */}
        {includeStock && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section
              id="secao-ruptura"
              className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Risco de ruptura</h3>
                  <InfoBalloon
                    align="left"
                    title="Risco de Ruptura nos Campeões de Giro"
                    description="Produtos vendidos no período com estoque zerado, abaixo do mínimo ou com duração prevista de até 5 dias."
                    formula="Dias = Estoque atual ÷ (Qtd vendida ÷ Dias do período)"
                  />
                </div>

                {data.stockoutRisks.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllStockout((v) => !v)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer"
                  >
                    {showAllStockout
                      ? 'Mostrar menos'
                      : `Ver lista (${data.stockoutRisks.length} de ${data.kpis.stockoutRisksCount}) \u2192`}
                  </button>
                )}
              </div>

              {data.stockoutRisks.length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">Nenhum alerta entre os produtos com saldo identificado.</p>
              ) : (
                <>
                  <div className="sm:hidden divide-y divide-zinc-800/70">
                    {visibleStockout.map((risk) => (
                      <div key={risk.productId} className="p-3.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProductThumb src={risk.imageUrl} alt={risk.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{risk.name}</p>
                            <p className="text-xs text-zinc-400">
                              Saída {num(risk.dailyVelocity, 2)}/{risk.unit}/dia · Est:{' '}
                              <strong className={risk.severity === 'critical' ? 'text-rose-400' : 'text-amber-300'}>
                                {num(risk.currentStock, 2)} {risk.unit}
                              </strong>
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            risk.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {Number(risk.currentStock) <= 0
                            ? 'Esgotado'
                            : risk.daysOfSupply
                              ? `~${risk.daysOfSupply} d`
                              : 'Baixo'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 bg-zinc-950/40">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Produto</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Saída/dia</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Estoque</th>
                          <th className="py-2.5 px-4 text-right font-semibold">Duração</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStockout.map((risk) => (
                          <tr key={risk.productId} className="border-t border-zinc-800/70 hover:bg-zinc-800/25">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <ProductThumb src={risk.imageUrl} alt={risk.name} size="sm" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate">{risk.name}</p>
                                  <p className="text-xs text-zinc-400">{risk.categoryName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                              {num(risk.dailyVelocity, 2)}/{risk.unit}
                            </td>
                            <td
                              className={`py-2.5 px-2 text-right font-bold tabular-nums whitespace-nowrap ${
                                risk.severity === 'critical' ? 'text-rose-400' : 'text-amber-300'
                              }`}
                            >
                              {num(risk.currentStock, 2)} {risk.unit}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  risk.severity === 'critical'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {Number(risk.currentStock) <= 0
                                  ? 'Esgotado'
                                  : risk.daysOfSupply
                                    ? `~${risk.daysOfSupply} d`
                                    : 'Abaixo mín.'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section
              id="secao-capital-parado"
              className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PackageX size={16} className="text-amber-400 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Capital parado</h3>
                  <InfoBalloon
                    align="right"
                    title="Capital Parado na Prateleira"
                    description="Produtos ativos com saldo positivo em estoque que não venderam nenhuma unidade neste período. Alvo ideal para combos casados ou queima de estoque."
                  />
                </div>

                {data.slowMovingProducts.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSlow((v) => !v)}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 cursor-pointer"
                  >
                    {showAllSlow
                      ? 'Mostrar menos'
                      : `Ver lista (${data.slowMovingProducts.length} de ${data.kpis.slowMovingCount}) \u2192`}
                  </button>
                )}
              </div>

              {data.slowMovingProducts.length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">
                  Nenhum produto com saldo positivo e custo informado ficou sem vendas no período.
                </p>
              ) : (
                <>
                  <div className="sm:hidden divide-y divide-zinc-800/70">
                    {visibleSlow.map((item) => (
                      <div key={item.productId} className="p-3.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                            <p className="text-xs text-zinc-400">
                              Est: {num(item.currentStock, 2)} {item.unit} · Custo {money(item.unitCost)}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {item.lastSaleAt
                                ? `Última venda: ${item.lastSaleAt.split('-').reverse().join('/')}`
                                : 'Nunca vendido'}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-300 text-sm shrink-0 tabular-nums">
                          {money(item.tiedCapital)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 bg-zinc-950/40">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Produto</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Estoque</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Custo Unit.</th>
                          <th className="py-2.5 px-4 text-right font-semibold">Parado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSlow.map((item) => (
                          <tr key={item.productId} className="border-t border-zinc-800/70 hover:bg-zinc-800/25">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate">{item.name}</p>
                                  <p className="text-xs text-zinc-400">{item.categoryName}</p>
                                  <p className="text-xs text-zinc-400">
                                    {item.lastSaleAt
                                      ? `Última venda: ${item.lastSaleAt.split('-').reverse().join('/')}`
                                      : 'Nunca vendido'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                              {num(item.currentStock, 2)} {item.unit}
                            </td>
                            <td className="py-2.5 px-2 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                              {money(item.unitCost)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-amber-300 tabular-nums whitespace-nowrap">
                              {money(item.tiedCapital)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </section>

      {/* Checklist rápido de itens sem custo no período */}
      {data.uncostedTopSellers.length > 0 && (
        <section className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> Produtos vendidos com custo pendente ({data.uncostedTopSellers.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Clique em qualquer item abaixo para digitar seu custo direto sem sair da tela:
              </p>
            </div>
            {onOpenCostEditor && (
              <button
                type="button"
                onClick={() => onOpenCostEditor()}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer shrink-0"
              >
                Corrigir todos &rarr;
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {data.uncostedTopSellers.map((item) => (
              <button
                key={item.productId}
                type="button"
                onClick={() => onOpenCostEditor?.(item.name)}
                className="inline-flex items-center gap-2 text-xs bg-zinc-950/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-zinc-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                <ProductThumb src={item.imageUrl} alt={item.name} size="sm" className="!w-6 !h-6 !rounded-md" />
                <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                <span className="text-amber-300 font-bold tabular-nums">{money(item.itemSubtotal)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
