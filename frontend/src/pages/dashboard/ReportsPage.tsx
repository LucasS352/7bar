import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  Layers,
  Lightbulb,
  Percent,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { InfoBalloon } from '@/components/InfoBalloon';
import {
  FinancialEvolutionChart,
  PeriodComparisonBar,
  type DailySales,
  type SalesComparison,
} from './SalesEvolution';
import {
  AdegaInsightsPanel,
  type AdegaInsightsData,
  type ProductRankingRow,
} from './AdegaInsightsPanel';

interface UncostedProduct {
  productId: string;
  name: string;
  unit: string;
  quantity: string;
  itemSubtotal: string;
}

interface SalesReport {
  period: { startDate: string; endDate: string; days: number; timezone: string; includesOpenDays?: boolean };
  daily: DailySales[];
  comparison: SalesComparison;
  summary: {
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
  };
  productLimit: number;
  products: {
    productId: string;
    name: string;
    unit: string;
    quantity: string;
    itemSubtotal: string;
    totalCost: string;
    grossProfit: string;
    marginPercent: string | null;
  }[];
  uncostedProducts?: UncostedProduct[];
}

interface ProductRankingResponse {
  period: { startDate: string; endDate: string; days: number; timezone: string };
  filters: {
    sortBy: SortOption;
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
  };
  categories: { id: string; name: string }[];
  items: ProductRankingRow[];
}

type ReportTab = 'overview' | 'ranking' | 'insights';
type SortOption = 'profit' | 'revenue' | 'quantity' | 'margin' | 'cost';
type PresetKey = 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'month';

const money = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatQty = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

const formatPct = (value: string | number | null | undefined, digits = 2) =>
  Number(value ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const dateLabel = (value: string) => value.split('-').reverse().join('/');

const toIsoBrt = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(date);

const shiftDaysBrt = (daysOffset: number) => {
  const base = toIsoBrt(new Date());
  const ms = Date.parse(`${base}T12:00:00Z`) + daysOffset * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
};

function resolvePresetDates(preset: PresetKey): { start: string; end: string } {
  const todayStr = toIsoBrt(new Date());
  if (preset === 'today') return { start: todayStr, end: todayStr };
  if (preset === 'yesterday') {
    const y = shiftDaysBrt(-1);
    return { start: y, end: y };
  }
  if (preset === '7d') return { start: shiftDaysBrt(-6), end: todayStr };
  if (preset === '15d') return { start: shiftDaysBrt(-14), end: todayStr };
  if (preset === '30d') return { start: shiftDaysBrt(-29), end: todayStr };
  return { start: `${todayStr.slice(0, 8)}01`, end: todayStr };
}

function sanitizeCsvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadRankingCsv(items: ProductRankingRow[], startDate: string, endDate: string) {
  const headers = [
    'Rank',
    'Produto',
    'Categoria',
    'Unidade',
    'Vendas',
    'Quantidade',
    'Preco_Medio_R$',
    'Custo_Medio_Unit_R$',
    'Faturamento_R$',
    'Share_Receita_%',
    'Custo_Total_CMV_R$',
    'Lucro_Real_R$',
    'Share_Lucro_%',
    'Margem_%',
    'Markup_%',
    'Cobertura_Custo_%',
    'Estoque_Atual',
  ];
  const rows = items.map((item) =>
    [
      item.rank,
      item.name,
      item.categoryName,
      item.unit,
      item.salesCount,
      item.quantity,
      item.avgSalePrice,
      item.avgUnitCost,
      item.itemSubtotal,
      item.revenueSharePercent ?? '',
      item.totalCost,
      item.grossProfit,
      item.profitSharePercent ?? '',
      item.marginPercent ?? '',
      item.markupPercent ?? '',
      item.costCoveragePercent,
      item.currentStock ?? '',
    ]
      .map(sanitizeCsvCell)
      .join(';'),
  );
  const csv = `\uFEFF${headers.join(';')}\r\n${rows.join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ranking-produtos-adega-${startDate}-a-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const costBadge: Record<ProductRankingRow['costSource'], { label: string; cls: string }> = {
  historical: { label: 'Lote/FIFO', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  catalog_fallback: { label: 'Catálogo', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  mixed: { label: 'Misto', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  untracked: { label: 'Sem custo', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

const stockBadge: Record<ProductRankingRow['stockAlert'], { label: string; cls: string }> = {
  out: { label: 'Esgotado', cls: 'text-rose-400 font-bold' },
  low: { label: 'Baixo', cls: 'text-amber-300 font-bold' },
  ok: { label: 'OK', cls: 'text-emerald-400' },
  unknown: { label: 'Combo/N/A', cls: 'text-zinc-500' },
};

const PRESETS: { id: PresetKey; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: '7d', label: '7 dias' },
  { id: '15d', label: '15 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'month', label: 'Este mês' },
];

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  return ['admin', 'superadmin'].includes(user?.role ?? '') ? (
    <SalesReports key={JSON.stringify([user?.tenant, user?.id])} />
  ) : (
    <Navigate to="/dashboard/inventory" replace />
  );
}

function SalesReports() {
  const navigate = useNavigate();
  const initialRange = useMemo(() => resolvePresetDates('7d'), []);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [query, setQuery] = useState(() => ({
    startDate: initialRange.start,
    endDate: initialRange.end,
    version: 0,
  }));

  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [uncostedModalOpen, setUncostedModalOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<SalesReport | null>(null);
  const [ranking, setRanking] = useState<ProductRankingResponse | null>(null);
  const [insights, setInsights] = useState<AdegaInsightsData | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>('profit');
  const [categoryId, setCategoryId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [limit, setLimit] = useState(50);

  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');

  useEffect(() => {
    if (!dateMenuOpen) return;
    const onOutside = (event: MouseEvent | TouchEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setDateMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDateMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [dateMenuOpen]);

  // 1. Relatório principal (Lucro Real & Evolução)
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiGet<SalesReport>('/reports/sales', {
      params: { startDate: query.startDate, endDate: query.endDate },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setError('');
          setReport(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Não foi possível carregar o relatório financeiro. Verifique sua conexão e tente novamente.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  // 2. Ranking Detalhado de Produtos
  useEffect(() => {
    if (activeTab !== 'ranking') return;
    const controller = new AbortController();
    setRankingLoading(true);
    setError('');
    apiGet<ProductRankingResponse>('/reports/products-ranking', {
      params: {
        startDate: query.startDate,
        endDate: query.endDate,
        sortBy,
        limit,
        ...(categoryId ? { categoryId } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
      },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setError('');
          setRanking(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Não foi possível carregar o ranking de produtos.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRankingLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, query, sortBy, categoryId, appliedSearch, limit]);

  // 3. Insights da Adega
  useEffect(() => {
    if (activeTab !== 'insights') return;
    const controller = new AbortController();
    setInsightsLoading(true);
    setError('');
    apiGet<AdegaInsightsData>('/reports/adega-insights', {
      params: { startDate: query.startDate, endDate: query.endDate },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setError('');
          setInsights(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Não foi possível carregar os insights da adega.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInsightsLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, query]);

  const activePreset = useMemo(() => {
    for (const preset of PRESETS) {
      const range = resolvePresetDates(preset.id);
      if (range.start === query.startDate && range.end === query.endDate) return preset.id;
    }
    return null;
  }, [query.startDate, query.endDate]);

  function applyRange(nextStart = startDate, nextEnd = endDate) {
    const days = (Date.parse(nextEnd) - Date.parse(nextStart)) / 86_400_000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 92) {
      setValidation('Selecione um período de 1 a 92 dias.');
      return;
    }
    setValidation('');
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setDateMenuOpen(false);
    setQuery((prev) => ({ startDate: nextStart, endDate: nextEnd, version: prev.version + 1 }));
  }

  function applyPreset(preset: PresetKey) {
    const { start, end } = resolvePresetDates(preset);
    applyRange(start, end);
  }

  const coveragePct = Number(report?.summary.costCoveragePercent ?? 100);
  const profitPositive = Number(report?.summary.grossProfit ?? 0) >= 0;
  const profitCompPct =
    report?.comparison.grossProfitChangePercent !== null &&
    report?.comparison.grossProfitChangePercent !== undefined
      ? Number(report.comparison.grossProfitChangePercent)
      : null;
  const profitCompDiff = Number(report?.comparison.grossProfitDifference ?? 0);

  return (
    <div className="w-full pb-8 sm:pb-10 space-y-4 sm:space-y-5">
      {/* Breadcrumb + Título + Abas (100% fluido sem margens laterais vazias) */}
      <div className="space-y-2">
        <nav aria-label="Navegação estrutural" className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Link to="/" className="hover:text-zinc-300 transition">PDV</Link>
          <span>/</span>
          <Link to="/dashboard" className="hover:text-zinc-300 transition">Analytics</Link>
          <span>/</span>
          <span className="text-zinc-300 font-medium">Relatórios</span>
        </nav>

        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2.5 tracking-tight">
            <span className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 shrink-0">
              <BarChart3 size={20} className="sm:w-[22px] sm:h-[22px]" />
            </span>
            <span className="truncate">Relatórios Financeiros &amp; Adega</span>
          </h1>

          {/* Abas responsivas: grid de 3 colunas no celular, inline-flex no desktop */}
          <div
            role="tablist"
            aria-label="Seções do relatório"
            className="grid grid-cols-3 sm:inline-flex bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl gap-1 w-full lg:w-auto"
          >
            {[
              { id: 'overview', label: 'Lucro & Evolução', shortLabel: 'Lucro', icon: TrendingUp },
              { id: 'ranking', label: 'Ranking de Produtos', shortLabel: 'Ranking', icon: Award },
              { id: 'insights', label: 'Insights da Adega', shortLabel: 'Insights', icon: Lightbulb },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id as ReportTab)}
                  className={`px-2 sm:px-3.5 py-2 rounded-lg text-[11px] sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span className="sm:hidden leading-none">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </header>
      </div>

      {/* Barra Unificada de Filtro de Período (otimizada p/ mobile e desktop widescreen) */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyRange();
        }}
        className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5"
      >
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 flex-1">
          {/* No mobile, grade 3x2 ultra limpa; no desktop, pílulas em linha */}
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5">
            {PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`text-xs font-semibold px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg border transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <span className="hidden md:block h-6 w-px bg-zinc-800 mx-0.5" aria-hidden="true" />

          {/* Seletor de datas + Botão Consultar no mobile ficam alinhados na mesma linha */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 lg:flex-initial justify-between">
            <div ref={datePickerRef} className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setDateMenuOpen((prev) => !prev)}
                aria-expanded={dateMenuOpen}
                className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium text-zinc-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Calendar size={14} className="text-zinc-400 shrink-0" />
                  <span className="truncate">
                    {dateLabel(startDate)} — {dateLabel(endDate)}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-zinc-400 shrink-0 transition-transform ${dateMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dateMenuOpen && (
                <div className="absolute left-0 right-0 sm:right-auto top-full mt-2 sm:w-72 bg-zinc-950 border border-zinc-700 rounded-2xl p-4 shadow-2xl z-40 space-y-3">
                  <p className="text-xs font-bold text-zinc-200">Selecionar intervalo (até 92 dias)</p>
                  <label className="text-xs text-zinc-400 flex flex-col gap-1">
                    Data inicial
                    <input
                      required
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white [color-scheme:dark]"
                    />
                  </label>
                  <label className="text-xs text-zinc-400 flex flex-col gap-1">
                    Data final
                    <input
                      required
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-white [color-scheme:dark]"
                    />
                  </label>
                  <p className="text-[11px] text-zinc-500">Fuso comercial UTC−03:00.</p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDateMenuOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRange(startDate, endDate)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                    >
                      Aplicar período
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="lg:hidden shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-3.5 py-2 font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Consultar
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="hidden lg:inline-flex shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 font-semibold text-sm items-center gap-2 shadow-sm shadow-blue-600/20 transition cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Consultar
        </button>
      </form>

      {validation && (
        <p role="alert" className="text-amber-300 text-sm bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-2.5">
          {validation}
        </p>
      )}

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setQuery((q) => ({ ...q, version: q.version + 1 }))}
            className="mt-2 underline text-sm font-semibold cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ABA 1: LUCRO & EVOLUÇÃO */}
      {activeTab === 'overview' && (
        <section aria-live="polite" aria-busy={loading} className="space-y-4">
          {loading && !report && (
            <p role="status" className="text-zinc-400 text-sm py-4">
              Calculando faturamento, custos e lucro real…
            </p>
          )}

          {report && (
            <>
              {/* Cabeçalho Resumo do Período + Badge Cobertura */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Resumo do período</h2>
                  <p className="text-xs text-zinc-400">
                    Desempenho de {dateLabel(report.period.startDate)} a {dateLabel(report.period.endDate)}.
                  </p>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-semibold ${
                    coveragePct >= 95
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>Cobertura de custos {formatPct(coveragePct, 1)}%</span>
                  <InfoBalloon
                    align="right"
                    title="Cobertura de custos"
                    description="Percentual do faturamento que possui custo cadastrado (por lote FIFO ou preço de custo do catálogo). Quanto mais perto de 100%, mais exato é o seu lucro real."
                    formula="(Receita com custo ÷ Receita total de itens) × 100"
                  />
                </div>
              </div>

              {/* LINHA 1 — 4 KPIs PRINCIPAIS (2x2 no celular, 4 colunas no desktop) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {/* 1. Faturamento líquido */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                        <Database size={14} className="sm:w-4 sm:h-4" />
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate">Faturamento</span>
                    </div>
                    <InfoBalloon
                      align="left"
                      title="Faturamento líquido"
                      description="Soma de todas as vendas concluídas no caixa e comandas do período, já considerando descontos aplicados e acréscimos/taxas. Vendas canceladas e ajustes fiscais ficam de fora."
                      formula="Σ total das vendas concluídas"
                    />
                  </div>
                  <p className="text-lg sm:text-2xl xl:text-[26px] font-extrabold text-white mt-2.5 sm:mt-3 tracking-tight break-words">
                    {money(report.summary.revenue)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 leading-snug">
                    {report.summary.transactions.toLocaleString('pt-BR')} vendas · Ticket {money(report.summary.averageTicket)}
                  </p>
                </div>

                {/* 2. Lucro das vendas (destaque esmeralda) */}
                <div
                  className={`rounded-2xl p-3 sm:p-4 border flex flex-col justify-between shadow-lg ${
                    profitPositive
                      ? 'bg-gradient-to-br from-emerald-950/65 via-zinc-900 to-zinc-900 border-emerald-500/40 shadow-emerald-950/30'
                      : 'bg-gradient-to-br from-rose-950/60 via-zinc-900 to-zinc-900 border-rose-500/40 shadow-rose-950/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border shrink-0 ${
                          profitPositive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        <TrendingUp size={14} className="sm:w-4 sm:h-4" />
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          profitPositive ? 'text-emerald-200' : 'text-rose-200'
                        }`}
                      >
                        Lucro vendas
                      </span>
                    </div>
                    <InfoBalloon
                      align="right"
                      title="Lucro das vendas (Lucro Bruto Real)"
                      description="É quanto efetivamente sobrou da operação de vendas após pagar o custo das mercadorias vendidas (CMV) e abater descontos. Despesas fixas (aluguel, energia, folha) não entram aqui."
                      formula="Faturamento líquido − CMV"
                    />
                  </div>
                  <p
                    className={`text-lg sm:text-2xl xl:text-[26px] font-extrabold mt-2.5 sm:mt-3 tracking-tight break-words ${
                      profitPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {money(report.summary.grossProfit)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 leading-snug">
                    Resultado líquido
                    {report.summary.markupPercent !== null ? ` · Markup ${formatPct(report.summary.markupPercent)}%` : ''}
                  </p>
                </div>

                {/* 3. Margem */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
                        <Percent size={14} className="sm:w-4 sm:h-4" />
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate">Margem</span>
                    </div>
                    <InfoBalloon
                      align="left"
                      title="Margem de Lucro"
                      description="Indica quantos % de cada real faturado viraram lucro bruto após pagar a mercadoria. Ex.: margem de 33% significa que a cada R$ 100 vendidos, R$ 33 são lucro bruto."
                      formula="(Lucro das vendas ÷ Faturamento líquido) × 100"
                    />
                  </div>
                  <p className="text-lg sm:text-2xl xl:text-[26px] font-extrabold text-white mt-2.5 sm:mt-3 tracking-tight">
                    {report.summary.marginPercent !== null ? `${formatPct(report.summary.marginPercent)}%` : '—'}
                  </p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Sobre o faturamento</p>
                </div>

                {/* 4. Vendas realizadas */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                        <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate">Vendas</span>
                    </div>
                    <InfoBalloon
                      align="right"
                      title="Vendas realizadas"
                      description="Total de cupons/vendas concluídas no PDV ou em comandas fechadas dentro do período selecionado."
                    />
                  </div>
                  <p className="text-lg sm:text-2xl xl:text-[26px] font-extrabold text-white mt-2.5 sm:mt-3 tracking-tight">
                    {report.summary.transactions.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Concluídas no período</p>
                </div>
              </div>

              {/* LINHA 2 — 4 CARDS COMPACTOS (2x2 no celular, 4 colunas no desktop) */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
                {/* CMV */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
                  <span className="hidden sm:flex p-2 rounded-xl bg-zinc-800/90 border border-zinc-700/70 text-zinc-300 shrink-0">
                    <Tag size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">CMV (Custo)</span>
                      <InfoBalloon
                        align="left"
                        title="CMV — Custo das Mercadorias Vendidas"
                        description="Soma do custo das unidades vendidas (usando o custo do lote FIFO no momento da venda ou o custo do cadastro quando não havia lote)."
                        formula={`FIFO: ${money(report.summary.historicalCostRevenue)} · Catálogo: ${money(report.summary.fallbackCostRevenue)}`}
                      />
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-amber-400 mt-0.5 truncate">
                      {money(report.summary.totalCost)}
                    </p>
                  </div>
                </div>

                {/* Ticket médio */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
                  <span className="hidden sm:flex p-2 rounded-xl bg-zinc-800/90 border border-zinc-700/70 text-zinc-300 shrink-0">
                    <Receipt size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Ticket médio</span>
                      <InfoBalloon
                        align="right"
                        title="Ticket médio"
                        description="Quanto cada cliente gasta em média por compra no período. Aumentar o ticket médio (com combos e adicionais) faz faturar mais sem precisar de mais clientes."
                        formula="Faturamento líquido ÷ Vendas realizadas"
                      />
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-white mt-0.5 truncate">
                      {money(report.summary.averageTicket)}
                    </p>
                  </div>
                </div>

                {/* Descontos */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
                  <span className="hidden sm:flex p-2 rounded-xl bg-zinc-800/90 border border-zinc-700/70 text-zinc-300 shrink-0">
                    <Percent size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Descontos</span>
                      <InfoBalloon
                        align="left"
                        title="Descontos aplicados"
                        description="Soma dos descontos concedidos no fechamento das vendas deste período (já abatidos do faturamento líquido)."
                        formula={
                          Number(report.summary.saleAdditions) > 0
                            ? `Acréscimos/taxas somados: + ${money(report.summary.saleAdditions)}`
                            : undefined
                        }
                      />
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-rose-400 mt-0.5 truncate">
                      {money(report.summary.saleDiscounts)}
                    </p>
                  </div>
                </div>

                {/* Lucro por venda */}
                <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
                  <span className="hidden sm:flex p-2 rounded-xl bg-zinc-800/90 border border-zinc-700/70 text-zinc-300 shrink-0">
                    <Layers size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Lucro por venda</span>
                      <InfoBalloon
                        align="right"
                        title="Lucro médio por venda"
                        description="Valor médio de lucro bruto que cada venda deixa no caixa depois de descontar o custo dos produtos vendidos."
                        formula="Lucro das vendas ÷ Vendas realizadas"
                      />
                    </div>
                    <p
                      className={`text-base sm:text-lg font-extrabold mt-0.5 truncate ${
                        Number(report.summary.averageProfitPerSale) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {money(report.summary.averageProfitPerSale)}
                    </p>
                  </div>
                </div>
              </div>

              {/* LINHA 3 — COMPARAÇÃO COM PERÍODO ANTERIOR */}
              <PeriodComparisonBar
                daily={report.daily}
                currentRevenue={report.summary.revenue}
                currentGrossProfit={report.summary.grossProfit}
                comparison={report.comparison}
                includesOpenDays={report.period.includesOpenDays ?? false}
              />

              {/* LINHA 4 — EVOLUÇÃO FINANCEIRA (8 COL) + ATENÇÃO E OPORTUNIDADES (4 COL) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                <div className="xl:col-span-8 min-w-0">
                  <FinancialEvolutionChart daily={report.daily} />
                </div>

                <aside
                  aria-label="Atenção e oportunidades"
                  className="xl:col-span-4 bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                          <Lightbulb size={17} className="text-amber-400" /> Atenção e oportunidades
                        </h2>
                        <InfoBalloon
                          align="right"
                          title="Atenção e oportunidades"
                          description="Destaca automaticamente falhas no cadastro de custos que distorcem seu lucro e resume o ganho ou queda frente ao período anterior."
                        />
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Pontos que merecem sua atenção neste período.
                      </p>
                    </div>

                    {Number(report.summary.uncostedRevenue) > 0 || report.summary.uncostedItemsCount > 0 ? (
                      <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-3.5 space-y-2">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-amber-200">
                              {report.summary.uncostedItemsCount}{' '}
                              {report.summary.uncostedItemsCount === 1
                                ? 'produto sem custo cadastrado'
                                : 'produtos sem custo cadastrado'}
                            </p>
                            <p className="text-xs text-zinc-300 mt-0.5">
                              {money(report.summary.uncostedRevenue)} em vendas sem custo.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUncostedModalOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 pl-6 cursor-pointer"
                        >
                          <ExternalLink size={13} /> Revisar cadastro
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-2.5">
                        <CheckCircle2 size={17} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-emerald-200">Custos 100% cobertos</p>
                          <p className="text-xs text-zinc-300 mt-0.5">
                            Todos os produtos vendidos no período têm custo registrado.
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      className={`rounded-xl border p-3.5 flex items-start gap-2.5 ${
                        profitCompDiff >= 0
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-rose-500/30 bg-rose-500/5'
                      }`}
                    >
                      {profitCompDiff >= 0 ? (
                        <TrendingUp size={17} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <TrendingDown size={17} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-white">
                          {profitCompPct !== null
                            ? profitCompDiff >= 0
                              ? `Lucro cresceu ${formatPct(profitCompPct)}% no período`
                              : `Lucro recuou ${formatPct(Math.abs(profitCompPct))}% no período`
                            : 'Comparativo de lucro sem base anterior'}
                        </p>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                          Variação de{' '}
                          <strong className={profitCompDiff >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                            {profitCompDiff > 0 ? '+' : ''}
                            {money(profitCompDiff)}
                          </strong>{' '}
                          em relação ao período anterior ({money(report.comparison.grossProfit ?? 0)}).
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('insights')}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Ver horários de pico, rupturas e insights da adega</span>
                    <span>&rarr;</span>
                  </button>
                </aside>
              </div>

              {/* LINHA 5 — PRODUTOS POR FATURAMENTO (Desktop tabela + Mobile cards sem scroll lateral) */}
              <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden">
                <div className="p-4 sm:px-5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-bold text-white">Produtos por faturamento</h2>
                      <InfoBalloon
                        align="left"
                        title="Produtos por faturamento"
                        description="Top 20 itens por receita no período, mostrando custo (CMV), lucro bruto individual e barra visual de margem para identificar rapidamente produtos campeões de venda vs campeões de lucro."
                      />
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Principais produtos no período (receita vs CMV por item).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ranking')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Ver ranking completo &rarr;
                  </button>
                </div>

                {report.products.length === 0 ? (
                  <p className="p-6 text-sm text-zinc-400">Nenhum produto vendido neste período.</p>
                ) : (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-zinc-800/70">
                      {report.products.map((p) => {
                        const marginVal = p.marginPercent !== null ? Number(p.marginPercent) : null;
                        const barWidth =
                          marginVal !== null ? Math.max(4, Math.min(100, Math.abs(marginVal))) : 0;
                        const profitPos = Number(p.grossProfit) >= 0;
                        return (
                          <div key={`${p.productId}-${p.name}-${p.unit}`} className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-white text-sm leading-snug">
                                {p.name}{' '}
                                <span className="text-xs font-normal text-zinc-400">({p.unit})</span>
                              </p>
                              <span
                                className={`shrink-0 text-sm font-extrabold ${
                                  profitPos ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {money(p.grossProfit)}
                              </span>
                            </div>

                            {marginVal !== null && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      marginVal >= 25
                                        ? 'bg-emerald-400'
                                        : marginVal >= 10
                                          ? 'bg-amber-400'
                                          : 'bg-rose-400'
                                    }`}
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-semibold text-zinc-300 shrink-0">
                                  {formatPct(marginVal)}% margem
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                              <div>
                                <p className="text-[10px] text-zinc-500 uppercase">Qtd.</p>
                                <p className="font-semibold text-zinc-200">{formatQty(p.quantity)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-500 uppercase">Faturamento</p>
                                <p className="font-semibold text-white">{money(p.itemSubtotal)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-zinc-500 uppercase">CMV</p>
                                <p className="font-semibold text-amber-400">{money(p.totalCost)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800/80 bg-zinc-950/40">
                          <tr>
                            <th className="py-3 px-4 sm:px-5 font-semibold">Produto</th>
                            <th className="py-3 px-3 text-right font-semibold">Qtd.</th>
                            <th className="py-3 px-3 text-right font-semibold">Faturamento</th>
                            <th className="py-3 px-3 text-right font-semibold">Custo (CMV)</th>
                            <th className="py-3 px-3 text-right font-semibold">Lucro</th>
                            <th className="py-3 px-4 sm:px-5 text-right font-semibold">Margem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.products.map((p) => {
                            const marginVal = p.marginPercent !== null ? Number(p.marginPercent) : null;
                            const barWidth =
                              marginVal !== null ? Math.max(4, Math.min(100, Math.abs(marginVal))) : 0;
                            const profitPos = Number(p.grossProfit) >= 0;
                            return (
                              <tr
                                key={`${p.productId}-${p.name}-${p.unit}`}
                                className="border-t border-zinc-800/70 hover:bg-zinc-800/30 transition-colors"
                              >
                                <td className="py-3 px-4 sm:px-5 font-semibold text-white">
                                  {p.name}{' '}
                                  <span className="text-xs font-normal text-zinc-400">({p.unit})</span>
                                </td>
                                <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">
                                  {formatQty(p.quantity)}
                                </td>
                                <td className="py-3 px-3 text-right text-white font-medium tabular-nums">
                                  {money(p.itemSubtotal)}
                                </td>
                                <td className="py-3 px-3 text-right text-amber-400 font-medium tabular-nums">
                                  {money(p.totalCost)}
                                </td>
                                <td
                                  className={`py-3 px-3 text-right font-bold tabular-nums ${
                                    profitPos ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {money(p.grossProfit)}
                                </td>
                                <td className="py-3 px-4 sm:px-5 text-right tabular-nums">
                                  {marginVal !== null ? (
                                    <div className="inline-flex items-center justify-end gap-2.5">
                                      <span className="text-zinc-200 font-medium">
                                        {formatPct(marginVal)}%
                                      </span>
                                      <span
                                        aria-hidden="true"
                                        className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden"
                                      >
                                        <span
                                          className={`block h-full rounded-full ${
                                            marginVal >= 25
                                              ? 'bg-emerald-400'
                                              : marginVal >= 10
                                                ? 'bg-amber-400'
                                                : 'bg-rose-400'
                                          }`}
                                          style={{ width: `${barWidth}%` }}
                                        />
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-500">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </section>
      )}

      {/* ABA 2: RANKING DETALHADO DE PRODUTOS */}
      {activeTab === 'ranking' && (
        <section aria-live="polite" aria-busy={rankingLoading} className="space-y-4">
          {/* Barra de Filtros do Ranking (Mobile 100% alinhado + Desktop barra única) */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end gap-3">
            <label className="text-xs text-zinc-400 flex flex-col gap-1 sm:col-span-2 lg:flex-1 lg:min-w-[220px]">
              Buscar produto
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ex: Heineken, Whisky, Gelo..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setAppliedSearch(searchInput.trim());
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setAppliedSearch(searchInput.trim())}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer shrink-0"
                >
                  Filtrar
                </button>
              </div>
            </label>

            <label className="text-xs text-zinc-400 flex flex-col gap-1 lg:min-w-[175px]">
              Ordenar ranking por
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="profit">Maior Lucro Real (R&#36;)</option>
                <option value="revenue">Maior Faturamento</option>
                <option value="quantity">Maior Volume Vendido</option>
                <option value="margin">Maior Margem (%)</option>
                <option value="cost">Maior Custo Total (CMV)</option>
              </select>
            </label>

            <label className="text-xs text-zinc-400 flex flex-col gap-1 lg:min-w-[160px]">
              Categoria
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Todas as categorias</option>
                {(ranking?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-zinc-400 flex flex-col gap-1 w-28">
                Exibir
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value={25}>Top 25</option>
                  <option value={50}>Top 50</option>
                  <option value={100}>Top 100</option>
                </select>
              </label>

              {ranking && ranking.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadRankingCsv(ranking.items, query.startDate, query.endDate)}
                  className="flex-1 lg:flex-initial justify-center px-3.5 py-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={15} /> Exportar CSV
                </button>
              )}
            </div>
          </div>

          {rankingLoading && !ranking && (
            <p role="status" className="text-zinc-400 text-sm">
              Montando ranking detalhado…
            </p>
          )}

          {ranking && (
            <>
              {/* Totais do Filtro com balãozinho */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs text-zinc-400">Itens no filtro</p>
                    <InfoBalloon
                      align="left"
                      title="Itens distintos no filtro"
                      description="Quantidade total de produtos diferentes vendidos dentro da busca/categoria selecionada."
                    />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white mt-1">
                    {ranking.totals.distinctProducts.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs text-zinc-400">Unidades vendidas</p>
                    <InfoBalloon
                      align="right"
                      title="Unidades vendidas"
                      description="Soma das quantidades vendidas (unidades, litros ou kg) considerando os filtros atuais."
                    />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white mt-1">
                    {formatQty(ranking.totals.totalUnitsSold)}
                  </p>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs text-zinc-400">Faturamento itens</p>
                    <InfoBalloon
                      align="left"
                      title="Faturamento dos itens"
                      description="Soma dos subtotais dos produtos filtrados antes de descontos ou acréscimos gerais do cupom."
                    />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white mt-1">{money(ranking.totals.totalRevenue)}</p>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs text-zinc-400">CMV total</p>
                    <InfoBalloon
                      align="right"
                      title="CMV do ranking"
                      description="Custo total das mercadorias vendidas para os produtos exibidos no filtro."
                    />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-amber-300 mt-1">{money(ranking.totals.totalCost)}</p>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] sm:text-xs text-zinc-400">Lucro Bruto Itens</p>
                    <InfoBalloon
                      align="right"
                      title="Lucro Bruto dos Itens"
                      description="Diferença entre o faturamento dos produtos filtrados e seu respectivo CMV, com a margem média ponderada."
                    />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
                    {money(ranking.totals.totalGrossProfit)}
                    {ranking.totals.averageMarginPercent !== null && (
                      <span className="text-xs font-normal text-zinc-400 ml-1">
                        ({formatPct(ranking.totals.averageMarginPercent)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
                {ranking.items.length === 0 ? (
                  <p className="p-6 text-zinc-400">Nenhum produto encontrado para os filtros aplicados.</p>
                ) : (
                  <>
                    {/* Cards Mobile (< md) */}
                    <div className="md:hidden divide-y divide-zinc-800/70">
                      {ranking.items.map((item) => {
                        const cBadge = costBadge[item.costSource];
                        const sBadge = stockBadge[item.stockAlert];
                        return (
                          <div key={item.productId} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-sm leading-snug">
                                  <span className="text-blue-400 font-bold mr-1.5">#{item.rank}</span>
                                  {item.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[11px] text-zinc-400">{item.categoryName}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cBadge.cls}`}>
                                    {cBadge.label}
                                  </span>
                                  {item.currentStock !== null && (
                                    <span className={`text-[11px] ${sBadge.cls}`}>
                                      · Est: {formatQty(item.currentStock)} {item.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p
                                  className={`text-sm font-extrabold ${
                                    Number(item.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {money(item.grossProfit)}
                                </p>
                                <p className="text-[11px] text-zinc-400">
                                  {item.marginPercent !== null ? `${formatPct(item.marginPercent)}%` : '—'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                              <div>
                                <p className="text-[10px] text-zinc-500">Qtd</p>
                                <p className="font-semibold text-zinc-200">{formatQty(item.quantity)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-500">Preço Méd</p>
                                <p className="font-semibold text-zinc-300">{money(item.avgSalePrice)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-500">Fat.</p>
                                <p className="font-semibold text-white">{money(item.itemSubtotal)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-zinc-500">CMV</p>
                                <p className="font-semibold text-amber-300">{money(item.totalCost)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tabela Completa Desktop (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-zinc-400 text-[11px] uppercase border-b border-zinc-800 bg-zinc-950/40">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Produto / Categoria</th>
                            <th className="p-3 text-right">Qtd</th>
                            <th className="p-3 text-right">Preço Méd.</th>
                            <th className="p-3 text-right">Custo Méd.</th>
                            <th className="p-3 text-right">Faturamento</th>
                            <th className="p-3 text-right">CMV</th>
                            <th className="p-3 text-right">Lucro Real</th>
                            <th className="p-3 text-right">Margem</th>
                            <th className="p-3 text-right">Estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.items.map((item) => {
                            const cBadge = costBadge[item.costSource];
                            const sBadge = stockBadge[item.stockAlert];
                            return (
                              <tr key={item.productId} className="border-t border-zinc-800/80 hover:bg-zinc-800/30">
                                <td className="p-3 font-bold text-zinc-400">#{item.rank}</td>
                                <td className="p-3">
                                  <p className="font-semibold text-white">{item.name}</p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-xs text-zinc-500">
                                      {item.categoryName} · {item.salesCount} vendas
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cBadge.cls}`}>
                                      {cBadge.label}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-right whitespace-nowrap text-zinc-200 tabular-nums">
                                  {formatQty(item.quantity)}{' '}
                                  <span className="text-xs text-zinc-500">{item.unit}</span>
                                </td>
                                <td className="p-3 text-right whitespace-nowrap text-zinc-300 tabular-nums">
                                  {money(item.avgSalePrice)}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap text-zinc-400 tabular-nums">
                                  {money(item.avgUnitCost)}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap tabular-nums">
                                  <p className="font-medium text-white">{money(item.itemSubtotal)}</p>
                                  {item.revenueSharePercent && (
                                    <p className="text-[11px] text-zinc-500">{formatPct(item.revenueSharePercent)}% rec.</p>
                                  )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap text-amber-300 tabular-nums">
                                  {money(item.totalCost)}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap tabular-nums">
                                  <p
                                    className={`font-bold ${
                                      Number(item.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {money(item.grossProfit)}
                                  </p>
                                  {item.profitSharePercent && (
                                    <p className="text-[11px] text-zinc-500">{formatPct(item.profitSharePercent)}% luc.</p>
                                  )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap text-zinc-200 tabular-nums">
                                  {item.marginPercent !== null ? `${formatPct(item.marginPercent)}%` : '—'}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap tabular-nums">
                                  <p className={`text-xs ${sBadge.cls}`}>
                                    {item.currentStock !== null
                                      ? `${formatQty(item.currentStock)} ${item.unit}`
                                      : sBadge.label}
                                  </p>
                                  {item.stockAlert !== 'ok' && item.stockAlert !== 'unknown' && (
                                    <p className={`text-[10px] ${sBadge.cls}`}>{sBadge.label}</p>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* ABA 3: INSIGHTS DA ADEGA */}
      {activeTab === 'insights' && (
        <section aria-live="polite" aria-busy={insightsLoading} className="space-y-4">
          {insightsLoading && !insights && (
            <p role="status" className="text-zinc-400 text-sm">
              Analisando horários de pico, rupturas e oportunidades da adega…
            </p>
          )}
          {insights && <AdegaInsightsPanel data={insights} />}
        </section>
      )}

      {/* MODAL REVISAR PRODUTOS SEM CUSTO CADASTRADO */}
      {uncostedModalOpen && report && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setUncostedModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="uncosted-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-start justify-between gap-3">
              <div>
                <h3 id="uncosted-modal-title" className="font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  Produtos vendidos sem custo cadastrado
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Estes itens foram vendidos entre {dateLabel(report.period.startDate)} e{' '}
                  {dateLabel(report.period.endDate)} com custo R&#36; 0,00 ({money(report.summary.uncostedRevenue)} em faturamento).
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setUncostedModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/70">
              {(report.uncostedProducts ?? []).length === 0 ? (
                <p className="p-5 text-sm text-zinc-400">
                  Consulte a aba <strong>Insights da Adega</strong> ou o <strong>Ranking de Produtos</strong> filtrado por &ldquo;Sem custo&rdquo;.
                </p>
              ) : (
                (report.uncostedProducts ?? []).map((item) => (
                  <div key={item.productId} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs text-zinc-400">
                        Qtd vendida: {formatQty(item.quantity)} {item.unit}
                      </p>
                    </div>
                    <span className="font-bold text-amber-300 shrink-0">{money(item.itemSubtotal)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUncostedModalOpen(false);
                  navigate('/dashboard/inventory');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                Abrir Catálogo
              </button>
              <button
                type="button"
                onClick={() => {
                  setUncostedModalOpen(false);
                  navigate('/dashboard/inventory/mass-edit');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white cursor-pointer"
              >
                Editar custos em massa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
