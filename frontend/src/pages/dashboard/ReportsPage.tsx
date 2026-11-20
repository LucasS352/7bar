import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BarChart2,
  Download,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { SalesEvolution, type DailySales, type SalesComparison } from './SalesEvolution';
import {
  AdegaInsightsPanel,
  type AdegaInsightsData,
  type ProductRankingRow,
} from './AdegaInsightsPanel';

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

const money = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateLabel = (value: string) => value.split('-').reverse().join('/');

const toIsoBrt = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(date);

const shiftDaysBrt = (daysOffset: number) => {
  const base = toIsoBrt(new Date());
  const ms = Date.parse(`${base}T12:00:00Z`) + daysOffset * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
};

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

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  return ['admin', 'superadmin'].includes(user?.role ?? '') ? (
    <SalesReports key={JSON.stringify([user?.tenant, user?.id])} />
  ) : (
    <Navigate to="/dashboard/inventory" replace />
  );
}

function SalesReports() {
  const initialToday = toIsoBrt(new Date());
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [startDate, setStartDate] = useState(initialToday);
  const [endDate, setEndDate] = useState(initialToday);
  const [query, setQuery] = useState(() => ({ startDate: initialToday, endDate: initialToday, version: 0 }));

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

  // 2. Ranking Detalhado de Produtos (carrega na aba ranking ou quando filtros mudam)
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

  function applyRange(nextStart = startDate, nextEnd = endDate) {
    const days = (Date.parse(nextEnd) - Date.parse(nextStart)) / 86_400_000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 92) {
      setValidation('Selecione um período de 1 a 92 dias.');
      return;
    }
    setValidation('');
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setQuery((prev) => ({ startDate: nextStart, endDate: nextEnd, version: prev.version + 1 }));
  }

  function applyPreset(preset: 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'month') {
    const todayStr = toIsoBrt(new Date());
    if (preset === 'today') return applyRange(todayStr, todayStr);
    if (preset === 'yesterday') {
      const y = shiftDaysBrt(-1);
      return applyRange(y, y);
    }
    if (preset === '7d') return applyRange(shiftDaysBrt(-6), todayStr);
    if (preset === '15d') return applyRange(shiftDaysBrt(-14), todayStr);
    if (preset === '30d') return applyRange(shiftDaysBrt(-29), todayStr);
    const monthStart = `${todayStr.slice(0, 8)}01`;
    return applyRange(monthStart, todayStr);
  }

  return (
    <div className="pb-8 max-w-7xl mx-auto w-full space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-blue-400" /> Relatórios Financeiros &amp; Adega
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Lucro real (Receita − CMV), ranking detalhado de produtos e inteligência de giro.
          </p>
        </div>

        {/* Navegação de Abas */}
        <div
          role="tablist"
          aria-label="Seções do relatório"
          className="inline-flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl gap-1 self-start"
        >
          {[
            { id: 'overview', label: 'Lucro & Evolução', icon: TrendingUp },
            { id: 'ranking', label: 'Ranking de Produtos', icon: Award },
            { id: 'insights', label: 'Insights da Adega', icon: Sparkles },
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
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  active ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Filtro de Período + Atalhos */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyRange();
        }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7d', label: '7 dias' },
            { id: '15d', label: '15 dias' },
            { id: '30d', label: '30 dias' },
            { id: 'month', label: 'Este mês' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'month')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-zinc-300 flex flex-col gap-1">
            Data inicial
            <input
              required
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white [color-scheme:dark]"
            />
          </label>
          <label className="text-sm text-zinc-300 flex flex-col gap-1">
            Data final
            <input
              required
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white [color-scheme:dark]"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw size={16} /> Consultar
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Até 92 dias por consulta · Dia comercial UTC−03:00 · Cancelamentos e ajustes fiscais ficam excluídos automaticamente.
        </p>
        {validation && (
          <p role="alert" className="text-amber-300 text-sm">
            {validation}
          </p>
        )}
      </form>

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setQuery((q) => ({ ...q, version: q.version + 1 }))}
            className="mt-2 underline text-sm font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ABA 1: LUCRO REAL & EVOLUÇÃO */}
      {activeTab === 'overview' && (
        <section aria-live="polite" aria-busy={loading} className="space-y-5">
          {loading && !report && <p role="status" className="text-zinc-400">Calculando faturamento, custos e lucro real…</p>}

          {report && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-white">
                  Período de {dateLabel(report.period.startDate)} a {dateLabel(report.period.endDate)}
                </h2>
                <span className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                  Cobertura de custo: <strong className="text-white">{Number(report.summary.costCoveragePercent).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
                </span>
              </div>

              {Number(report.summary.uncostedRevenue) > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs sm:text-sm text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Atenção à precisão do custo:</strong>{' '}
                    {money(report.summary.uncostedRevenue)} em faturamento ({report.summary.uncostedItemsCount} produto(s)) vieram de itens com preço de custo zerado. Para esses itens, o CMV considerado é R&#36; 0,00.
                  </div>
                </div>
              )}

              {/* KPIs Principais */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-400">Faturamento Líquido</p>
                  <p className="text-xl md:text-2xl font-bold text-white mt-1.5 break-words">
                    {money(report.summary.revenue)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {report.summary.transactions.toLocaleString('pt-BR')} vendas · Ticket {money(report.summary.averageTicket)}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-400">Custo das Mercadorias (CMV)</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-300 mt-1.5 break-words">
                    {money(report.summary.totalCost)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    FIFO Lotes: {money(report.summary.historicalCostRevenue)} · Catálogo: {money(report.summary.fallbackCostRevenue)}
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl col-span-2 lg:col-span-1">
                  <p className="text-xs sm:text-sm text-emerald-300 font-medium">Lucro Real das Vendas</p>
                  <p
                    className={`text-xl md:text-2xl font-bold mt-1.5 break-words ${
                      Number(report.summary.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {money(report.summary.grossProfit)}
                  </p>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Margem:{' '}
                    <strong>
                      {report.summary.marginPercent !== null ? `${report.summary.marginPercent}%` : '—'}
                    </strong>
                    {report.summary.markupPercent !== null && ` · Markup: ${report.summary.markupPercent}%`}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-400">Lucro Médio por Venda</p>
                  <p className="text-lg md:text-xl font-bold text-white mt-1.5">
                    {money(report.summary.averageProfitPerSale)}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-400">Descontos Aplicados</p>
                  <p className="text-lg md:text-xl font-bold text-rose-300 mt-1.5">
                    − {money(report.summary.saleDiscounts)}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-xs sm:text-sm text-zinc-400">Acréscimos / Taxas</p>
                  <p className="text-lg md:text-xl font-bold text-blue-300 mt-1.5">
                    + {money(report.summary.saleAdditions)}
                  </p>
                </div>
              </div>

              <SalesEvolution
                daily={report.daily}
                comparison={report.comparison}
                includesOpenDays={report.period.includesOpenDays ?? false}
              />

              {/* Resumo Rápido Top 20 por Faturamento com Custo e Lucro */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">Top {report.productLimit} Produtos por Faturamento</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Descontos gerais da venda são deduzidos no Lucro Real acima; na tabela abaixo exibimos receita vs CMV de cada item.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ranking')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Abrir Ranking Completo &amp; Filtros &rarr;
                  </button>
                </div>
                {report.products.length === 0 ? (
                  <p className="p-6 text-zinc-400">Nenhum produto vendido neste período.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                        <tr>
                          <th className="p-3.5">Produto</th>
                          <th className="p-3.5 text-right">Qtd</th>
                          <th className="p-3.5 text-right">Faturamento</th>
                          <th className="p-3.5 text-right">Custo (CMV)</th>
                          <th className="p-3.5 text-right">Lucro Real</th>
                          <th className="p-3.5 text-right">Margem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.products.map((p) => (
                          <tr
                            key={`${p.productId}-${p.name}-${p.unit}`}
                            className="border-t border-zinc-800/80 hover:bg-zinc-800/30"
                          >
                            <td className="p-3.5 font-medium text-white">
                              {p.name} <span className="text-xs text-zinc-500">({p.unit})</span>
                            </td>
                            <td className="p-3.5 text-right text-zinc-300">
                              {Number(p.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                            </td>
                            <td className="p-3.5 text-right text-white font-medium">{money(p.itemSubtotal)}</td>
                            <td className="p-3.5 text-right text-amber-300">{money(p.totalCost)}</td>
                            <td className="p-3.5 text-right font-semibold text-emerald-400">{money(p.grossProfit)}</td>
                            <td className="p-3.5 text-right text-zinc-300">
                              {p.marginPercent !== null ? `${p.marginPercent}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      )}

      {/* ABA 2: RANKING DETALHADO DE PRODUTOS */}
      {activeTab === 'ranking' && (
        <section aria-live="polite" aria-busy={rankingLoading} className="space-y-4">
          {/* Barra de Filtros do Ranking */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-400 flex flex-col gap-1 flex-1 min-w-[200px]">
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
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white cursor-pointer"
                >
                  Filtrar
                </button>
              </div>
            </label>

            <label className="text-xs text-zinc-400 flex flex-col gap-1 min-w-[170px]">
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

            <label className="text-xs text-zinc-400 flex flex-col gap-1 min-w-[160px]">
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

            <label className="text-xs text-zinc-400 flex flex-col gap-1 w-24">
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
                className="px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={15} /> Exportar CSV
              </button>
            )}
          </div>

          {rankingLoading && !ranking && (
            <p role="status" className="text-zinc-400">Montando ranking detalhado…</p>
          )}

          {ranking && (
            <>
              {/* Totais do Filtro */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
                  <p className="text-xs text-zinc-400">Itens no filtro</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {ranking.totals.distinctProducts.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
                  <p className="text-xs text-zinc-400">Unidades vendidas</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {Number(ranking.totals.totalUnitsSold).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
                  <p className="text-xs text-zinc-400">Faturamento itens</p>
                  <p className="text-lg font-bold text-white mt-1">{money(ranking.totals.totalRevenue)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5">
                  <p className="text-xs text-zinc-400">CMV total</p>
                  <p className="text-lg font-bold text-amber-300 mt-1">{money(ranking.totals.totalCost)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 col-span-2 lg:col-span-1">
                  <p className="text-xs text-zinc-400">Lucro Bruto Itens</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">
                    {money(ranking.totals.totalGrossProfit)}
                    {ranking.totals.averageMarginPercent !== null && (
                      <span className="text-xs font-normal text-zinc-400 ml-1">
                        ({ranking.totals.averageMarginPercent}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {ranking.items.length === 0 ? (
                  <p className="p-6 text-zinc-400">Nenhum produto encontrado para os filtros aplicados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
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
                              <td className="p-3 text-right whitespace-nowrap text-zinc-200">
                                {Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                                <span className="text-xs text-zinc-500">{item.unit}</span>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap text-zinc-300">
                                {money(item.avgSalePrice)}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap text-zinc-400">
                                {money(item.avgUnitCost)}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <p className="font-medium text-white">{money(item.itemSubtotal)}</p>
                                {item.revenueSharePercent && (
                                  <p className="text-[11px] text-zinc-500">{item.revenueSharePercent}% rec.</p>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap text-amber-300">
                                {money(item.totalCost)}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <p
                                  className={`font-bold ${
                                    Number(item.grossProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {money(item.grossProfit)}
                                </p>
                                {item.profitSharePercent && (
                                  <p className="text-[11px] text-zinc-500">{item.profitSharePercent}% luc.</p>
                                )}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap text-zinc-200">
                                {item.marginPercent !== null ? `${item.marginPercent}%` : '—'}
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <p className={`text-xs ${sBadge.cls}`}>
                                  {item.currentStock !== null
                                    ? `${Number(item.currentStock).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${item.unit}`
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
            <p role="status" className="text-zinc-400">Analisando horários de pico, rupturas e oportunidades da adega…</p>
          )}
          {insights && <AdegaInsightsPanel data={insights} />}
        </section>
      )}
    </div>
  );
}
