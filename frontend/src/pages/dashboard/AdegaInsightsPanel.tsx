import {
  AlertTriangle,
  Award,
  Clock,
  CreditCard,
  Flame,
  PackageX,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  period: { startDate: string; endDate: string; days: number; timezone: string };
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

const money = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const num = (v: string | number | null | undefined, maxDecimals = 2) =>
  Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: maxDecimals });

const severityStyles: Record<string, string> = {
  high: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
  medium: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
  positive: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
};

const severityBadge: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-300',
  medium: 'bg-amber-500/20 text-amber-300',
  positive: 'bg-emerald-500/20 text-emerald-300',
  info: 'bg-blue-500/20 text-blue-300',
};

export function AdegaInsightsPanel({ data }: { data: AdegaInsightsData }) {
  const hourlyChart = data.byHour.map((h) => ({
    label: h.label,
    revenueNum: Number(h.revenue),
    transactions: h.transactions,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs Específicos da Adega (2x2 no celular) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 min-w-0">
              <Clock size={14} className="text-amber-400 shrink-0" /> <span className="truncate">Turno Noturno</span>
            </p>
            <InfoBalloon
              align="left"
              title="Turno Noturno (18h–02h)"
              description="Percentual do faturamento da adega que aconteceu entre 18h e 02h59 (fuso UTC−03:00), além do horário de maior movimento."
            />
          </div>
          <p className="text-lg sm:text-xl font-bold text-white mt-1.5">
            {data.kpis.nightRevenueSharePercent !== null ? `${num(data.kpis.nightRevenueSharePercent, 1)}%` : '—'}
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 truncate">
            {data.kpis.peakHour
              ? `Pico às ${data.kpis.peakHour.label} (${money(data.kpis.peakHour.revenue)})`
              : 'Sem pico no período'}
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 min-w-0">
              <Flame size={14} className="text-blue-400 shrink-0" /> <span className="truncate">Fim de Semana</span>
            </p>
            <InfoBalloon
              align="right"
              title="Fim de Semana (Sex–Dom)"
              description="Quanto do faturamento veio de sexta-feira a domingo e qual foi o dia da semana mais forte em receita."
            />
          </div>
          <p className="text-lg sm:text-xl font-bold text-white mt-1.5">
            {data.kpis.weekendRevenueSharePercent !== null ? `${num(data.kpis.weekendRevenueSharePercent, 1)}%` : '—'}
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 truncate">
            {data.kpis.bestWeekday
              ? `Líder: ${data.kpis.bestWeekday.label}`
              : 'Sem vendas no período'}
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 min-w-0">
              <AlertTriangle size={14} className="text-rose-400 shrink-0" /> <span className="truncate">Risco Ruptura</span>
            </p>
            <InfoBalloon
              align="left"
              title="Itens em Risco de Ruptura"
              description="Quantidade de produtos com saída no período que já zeraram no estoque, ficaram abaixo do mínimo ou têm previsão para acabar em até 5 dias no ritmo atual."
            />
          </div>
          <p className="text-lg sm:text-xl font-bold text-rose-400 mt-1.5">
            {data.kpis.stockoutRisksCount}
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Estoque &le; 5 dias</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 min-w-0">
              <PackageX size={14} className="text-amber-400 shrink-0" /> <span className="truncate">Capital Parado</span>
            </p>
            <InfoBalloon
              align="right"
              title="Capital Parado (Sem Giro)"
              description="Soma do valor de custo em estoque (quantidade × preço de custo) de produtos ativos que não tiveram nenhuma venda neste período."
              formula="Σ (estoque atual × custo unitário)"
            />
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-300 mt-1.5 truncate">
            {money(data.kpis.totalTiedCapitalSlowMoving)}
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">0 vendas no período</p>
        </div>
      </div>

      {/* Cards de Insights Automáticos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400" />
          <h2 className="font-semibold text-white">Leitura Estratégica para o Dono</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((insight) => (
            <div
              key={insight.id}
              className={`rounded-2xl border p-4 space-y-2 ${severityStyles[insight.severity] ?? severityStyles.info}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-white leading-snug">{insight.title}</h3>
                <span
                  className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    severityBadge[insight.severity] ?? severityBadge.info
                  }`}
                >
                  {insight.metricValue}
                </span>
              </div>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed">{insight.description}</p>
              <p className="text-xs font-medium text-white/80 pt-1 border-t border-white/10">
                Ação recomendada: {insight.actionHint}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Horários de Pico (24h) & Performance por Dia da Semana */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white">Mapa de Horários (00h–23h · BRT)</h3>
            <InfoBalloon
              align="right"
              title="Mapa de Horários (00h–23h)"
              description="Distribuição do faturamento hora a hora ao longo do dia no horário de Brasília. Mostra exatamente quando sua adega vende mais."
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Identifique os horários de maior giro para planejar abastecimento de geladeira e equipe.
          </p>
          <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
            <div className="min-w-[520px] sm:min-w-0">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={hourlyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 10 }} interval={1} />
                  <YAxis
                    width={52}
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                  />
                  <Tooltip
                    formatter={(value) => [money(Number(value ?? 0)), 'Faturamento']}
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                    labelStyle={{ color: '#e4e4e7', fontWeight: 700 }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="revenueNum" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white">Lucro &amp; Faturamento por Dia da Semana</h3>
            <InfoBalloon
              align="right"
              title="Desempenho por Dia da Semana"
              description="Agrupa todas as vendas e lucros por dia da semana (segunda a domingo) no período consultado."
            />
          </div>
          <div className="sm:hidden divide-y divide-zinc-800/70">
            {data.byWeekday.map((day) => (
              <div key={day.dayOfWeek} className="p-3.5 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-white text-sm">{day.label}</p>
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
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Dia</th>
                  <th className="py-2.5 px-3 text-right">Vendas</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Lucro Real</th>
                  <th className="py-2.5 px-4 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {data.byWeekday.map((day) => (
                  <tr key={day.dayOfWeek} className="border-t border-zinc-800/70">
                    <td className="py-2.5 px-4 font-medium text-zinc-200">{day.label}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">{day.transactions}</td>
                    <td className="py-2.5 px-3 text-right text-white font-medium">{money(day.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                      {money(day.grossProfit)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300">
                      {day.marginPercent !== null ? `${num(day.marginPercent, 1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Categorias & Pagamentos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Rentabilidade por Categoria
            </h3>
            <InfoBalloon
              align="right"
              title="Rentabilidade por Categoria"
              description="Compara receita, CMV, lucro real e margem % entre cada categoria cadastrada (ex.: Cervejas, Destilados, Gelo, Conveniência)."
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
                      <span>Receita: <strong className="text-white">{money(cat.revenue)}</strong></span>
                      <span>CMV: <strong className="text-amber-300">{money(cat.totalCost)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4">Categoria</th>
                      <th className="py-2.5 px-3 text-right">Receita</th>
                      <th className="py-2.5 px-3 text-right">CMV</th>
                      <th className="py-2.5 px-3 text-right">Lucro Real</th>
                      <th className="py-2.5 px-4 text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryMix.map((cat) => (
                      <tr key={cat.categoryId ?? cat.categoryName} className="border-t border-zinc-800/70">
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-white">{cat.categoryName}</p>
                          <p className="text-xs text-zinc-500">
                            {num(cat.quantity, 2)} un · {cat.revenueSharePercent ?? '0'}% do total
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right text-white">{money(cat.revenue)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-300">{money(cat.totalCost)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                          {money(cat.grossProfit)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-zinc-300">
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

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-blue-400" />
            <h3 className="font-semibold text-white">Mix de Pagamentos</h3>
          </div>
          {data.paymentMix.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum pagamento registrado neste intervalo.</p>
          ) : (
            <div className="space-y-3">
              {data.paymentMix.map((pay) => {
                const pct = Number(pay.sharePercent ?? 0);
                return (
                  <div key={pay.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-200">
                        {pay.label} <span className="text-xs text-zinc-500">({pay.transactions} vendas)</span>
                      </span>
                      <span className="font-bold text-white">
                        {money(pay.revenue)}{' '}
                        <span className="text-xs font-normal text-zinc-400">({num(pct, 1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Campeões de Lucro vs Alta Margem */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Award size={16} className="text-emerald-400" />
            <h3 className="font-semibold text-white">Top Geradores de Lucro (R$)</h3>
          </div>
          {data.topProfitDrivers.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">Sem produtos com lucro calculado.</p>
          ) : (
            <div className="divide-y divide-zinc-800/70">
              {data.topProfitDrivers.map((item) => (
                <div key={item.productId} className="p-3.5 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        <span className="text-emerald-400 font-bold mr-2">#{item.rank}</span>
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {num(item.quantity, 2)} {item.unit} · Receita {money(item.itemSubtotal)} · CMV {money(item.totalCost)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-400 text-sm">{money(item.grossProfit)}</p>
                    <p className="text-xs text-zinc-400">
                      {item.marginPercent !== null ? `${num(item.marginPercent, 1)}% margem` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <h3 className="font-semibold text-white">Produtos de Alta Margem (&ge; 35%)</h3>
          </div>
          {data.highMarginOpportunities.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">
              Nenhum item com custo cadastrado atingiu margem &ge; 35% com ao menos 2 unidades vendidas.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800/70">
              {data.highMarginOpportunities.map((item) => (
                <div key={item.productId} className="p-3.5 px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-zinc-400">
                        {item.categoryName} · {num(item.quantity, 2)} {item.unit} vendidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-amber-300 text-sm">{num(item.marginPercent, 1)}% margem</p>
                    <p className="text-xs text-emerald-400">Lucro {money(item.grossProfit)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Risco de Ruptura & Capital Parado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" /> Risco de Ruptura nos Campeões de Giro
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Produtos vendidos no período cujo estoque está zerado, abaixo do mínimo ou dura &le; 5 dias.
              </p>
            </div>
            <InfoBalloon
              align="right"
              title="Risco de Ruptura"
              description="Calcula quantos dias ainda restam de estoque dividindo o saldo atual pela média de vendas diárias no período selecionado."
              formula="Dias = Estoque atual ÷ (Qtd vendida ÷ Dias do período)"
            />
          </div>
          {data.stockoutRisks.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">Nenhum produto em risco iminente de ruptura.</p>
          ) : (
            <>
              <div className="sm:hidden divide-y divide-zinc-800/70">
                {data.stockoutRisks.map((risk) => (
                  <div key={risk.productId} className="p-3.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={risk.imageUrl} alt={risk.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{risk.name}</p>
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
                  <thead className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4">Produto</th>
                      <th className="py-2.5 px-2 text-right">Saída/dia</th>
                      <th className="py-2.5 px-2 text-right">Estoque</th>
                      <th className="py-2.5 px-4 text-right">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockoutRisks.map((risk) => (
                      <tr key={risk.productId} className="border-t border-zinc-800/70">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductThumb src={risk.imageUrl} alt={risk.name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{risk.name}</p>
                              <p className="text-xs text-zinc-500">{risk.categoryName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-300">
                          {num(risk.dailyVelocity, 2)}/{risk.unit}
                        </td>
                        <td
                          className={`py-2.5 px-2 text-right font-bold ${
                            risk.severity === 'critical' ? 'text-rose-400' : 'text-amber-300'
                          }`}
                        >
                          {num(risk.currentStock, 2)} {risk.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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

        <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <PackageX size={16} className="text-amber-400" /> Capital Parado (Produtos Sem Saída)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Maiores valores de custo empatados em prateleira sem nenhuma venda no período.
              </p>
            </div>
            <InfoBalloon
              align="right"
              title="Capital Parado na Prateleira"
              description="Mostra dinheiro investido em estoque que não girou neste período. Bom alvo para criar combos casados ou promoções."
            />
          </div>
          {data.slowMovingProducts.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">Todo o estoque custeado teve saída neste período.</p>
          ) : (
            <>
              <div className="sm:hidden divide-y divide-zinc-800/70">
                {data.slowMovingProducts.map((item) => (
                  <div key={item.productId} className="p-3.5 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm truncate">{item.name}</p>
                        <p className="text-xs text-zinc-400">
                          Est: {num(item.currentStock, 2)} {item.unit} · Custo {money(item.unitCost)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-amber-300 text-sm shrink-0">
                      {money(item.tiedCapital)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-4">Produto</th>
                      <th className="py-2.5 px-2 text-right">Estoque</th>
                      <th className="py-2.5 px-2 text-right">Custo Unit.</th>
                      <th className="py-2.5 px-4 text-right">Parado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slowMovingProducts.map((item) => (
                      <tr key={item.productId} className="border-t border-zinc-800/70">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{item.name}</p>
                              <p className="text-xs text-zinc-500">{item.categoryName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-300">
                          {num(item.currentStock, 2)} {item.unit}
                        </td>
                        <td className="py-2.5 px-2 text-right text-zinc-400">{money(item.unitCost)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-amber-300">
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

      {/* Checklist de Itens Sem Custo */}
      {data.uncostedTopSellers.length > 0 && (
        <section className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 sm:p-5 space-y-2">
          <h3 className="font-semibold text-amber-300 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> Produtos vendidos com custo pendente ({data.uncostedTopSellers.length})
          </h3>
          <p className="text-xs text-zinc-300">
            Estes itens tiveram venda no período sem custo de compra registrado (custo R&#36; 0,00). Atualize o preço de custo no estoque para refletir o lucro real:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {data.uncostedTopSellers.map((item) => (
              <span
                key={item.productId}
                className="text-xs bg-zinc-900 border border-zinc-700 text-zinc-200 px-3 py-1 rounded-full"
              >
                {item.name} · {money(item.itemSubtotal)}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
