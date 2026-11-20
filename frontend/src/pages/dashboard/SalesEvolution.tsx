import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InfoBalloon } from '@/components/InfoBalloon';

export interface DailySales {
  date: string;
  revenue: string;
  totalCost?: string;
  grossProfit?: string;
  marginPercent?: string | null;
  transactions: number;
}

export interface SalesComparison {
  startDate: string;
  endDate: string;
  days: number;
  revenue: string;
  totalCost?: string;
  grossProfit?: string;
  marginPercent?: string | null;
  transactions: number;
  averageTicket: string;
  revenueDifference: string;
  revenueChangePercent: string | null;
  grossProfitDifference?: string;
  grossProfitChangePercent?: string | null;
  includesOpenDays: boolean;
}

const money = (value: string | number | undefined | null) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dateLabel = (date: string) => date.split('-').reverse().join('/');
const shortDateLabel = (date: string) => {
  const parts = date.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
};

const formatCompactYAxis = (value: number) => {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

function MiniSparkline({
  data,
  dataKey,
  positive,
  gradientId,
}: {
  data: Record<string, number>[];
  dataKey: string;
  positive: boolean;
  gradientId: string;
}) {
  const stroke = positive ? '#10b981' : '#f43f5e';
  const points = data.length >= 2 ? data : [{ [dataKey]: 0 }, ...data];

  return (
    <div className="w-20 h-9 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 3, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PeriodComparisonBar({
  daily,
  currentRevenue,
  currentGrossProfit,
  comparison,
  includesOpenDays,
}: {
  daily: DailySales[];
  currentRevenue: string;
  currentGrossProfit: string;
  comparison: SalesComparison;
  includesOpenDays: boolean;
}) {
  const sparkData = useMemo(
    () =>
      daily.map((day) => ({
        revenueNum: Number(day.revenue),
        profitNum: Number(day.grossProfit ?? 0),
      })),
    [daily],
  );

  const revPct = comparison.revenueChangePercent !== null ? Number(comparison.revenueChangePercent) : null;
  const revDiff = Number(comparison.revenueDifference);
  const revPositive = revDiff >= 0;

  const profitPct =
    comparison.grossProfitChangePercent !== null && comparison.grossProfitChangePercent !== undefined
      ? Number(comparison.grossProfitChangePercent)
      : null;
  const profitDiff = Number(comparison.grossProfitDifference ?? 0);
  const profitPositive = profitDiff >= 0;

  const isPartial = includesOpenDays || comparison.includesOpenDays;

  return (
    <section
      aria-label="Comparação com período anterior"
      className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="min-w-0 shrink-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm sm:text-base font-bold text-white">Comparação com período anterior</h2>
          <InfoBalloon
            align="left"
            title="Comparação com período anterior"
            description="Compara faturamento e lucro do período atual contra o mesmo número de dias corridos imediatamente anteriores (ex: últimos 7 dias vs 7 dias antes deles)."
          />
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Período anterior: {shortDateLabel(comparison.startDate)} a {shortDateLabel(comparison.endDate)} ·{' '}
          {comparison.transactions.toLocaleString('pt-BR')} vendas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 lg:max-w-2xl">
        {/* Bloco Faturamento */}
        <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-400">Faturamento</p>
            <p
              className={`text-lg font-extrabold leading-tight mt-0.5 ${
                revPct === null ? 'text-zinc-200' : revPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {revPct !== null
                ? `${revPositive && revPct > 0 ? '+' : ''}${revPct.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`
                : `${revDiff > 0 ? '+' : ''}${money(revDiff)}`}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {money(currentRevenue)} vs. {money(comparison.revenue)}
            </p>
          </div>
          <MiniSparkline
            data={sparkData}
            dataKey="revenueNum"
            positive={revPositive}
            gradientId="sparkRevGrad"
          />
        </div>

        {/* Bloco Lucro */}
        <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-400">Lucro</p>
            <p
              className={`text-lg font-extrabold leading-tight mt-0.5 ${
                profitPct === null ? 'text-zinc-200' : profitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {profitPct !== null
                ? `${profitPositive && profitPct > 0 ? '+' : ''}${profitPct.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`
                : `${profitDiff > 0 ? '+' : ''}${money(profitDiff)}`}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {money(currentGrossProfit)} vs. {money(comparison.grossProfit ?? 0)}
            </p>
          </div>
          <MiniSparkline
            data={sparkData}
            dataKey="profitNum"
            positive={profitPositive}
            gradientId="sparkProfitGrad"
          />
        </div>
      </div>

      {/* Badge Parcial / Completo */}
      <div className="shrink-0 flex items-center">
        {isPartial ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <AlertTriangle size={14} />
            <span>Comparação parcial</span>
            <InfoBalloon
              align="right"
              title="Comparação parcial"
              description="O intervalo selecionado inclui o dia de hoje (ainda em andamento) ou datas futuras. Enquanto o dia não fecha, os valores atuais são parciais contra dias anteriores fechados."
            />
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 size={14} />
            <span>Dias completos</span>
            <InfoBalloon
              align="right"
              title="Comparação de períodos completos"
              description="Todos os dias do período atual e do período anterior já foram encerrados, garantindo comparação justa de 24h por dia."
            />
          </div>
        )}
      </div>
    </section>
  );
}

export function FinancialEvolutionChart({ daily }: { daily: DailySales[] }) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');

  const series = useMemo(() => {
    if (granularity === 'daily') {
      return daily.map((day) => ({
        key: day.date,
        label: shortDateLabel(day.date),
        fullLabel: dateLabel(day.date),
        revenueNum: Number(day.revenue),
        costNum: Number(day.totalCost ?? 0),
        profitNum: Number(day.grossProfit ?? 0),
        marginPercent: day.marginPercent ?? null,
        transactions: day.transactions,
      }));
    }

    // Agrupamento semanal em blocos de segunda a domingo no fuso comercial
    const buckets: {
      key: string;
      start: string;
      end: string;
      revenue: number;
      cost: number;
      profit: number;
      transactions: number;
    }[] = [];

    for (const day of daily) {
      const dt = new Date(`${day.date}T12:00:00Z`);
      const wd = dt.getUTCDay(); // 0=dom, 1=seg...
      const offsetToMonday = wd === 0 ? -6 : 1 - wd;
      const monday = new Date(dt.getTime() + offsetToMonday * 86_400_000);
      const weekKey = monday.toISOString().slice(0, 10);

      let current = buckets[buckets.length - 1];
      if (!current || current.key !== weekKey) {
        current = {
          key: weekKey,
          start: day.date,
          end: day.date,
          revenue: 0,
          cost: 0,
          profit: 0,
          transactions: 0,
        };
        buckets.push(current);
      }
      current.end = day.date;
      current.revenue += Number(day.revenue);
      current.cost += Number(day.totalCost ?? 0);
      current.profit += Number(day.grossProfit ?? 0);
      current.transactions += day.transactions;
    }

    return buckets.map((b) => ({
      key: b.key,
      label: b.start === b.end ? shortDateLabel(b.start) : `${shortDateLabel(b.start)}–${shortDateLabel(b.end)}`,
      fullLabel: b.start === b.end ? dateLabel(b.start) : `${dateLabel(b.start)} a ${dateLabel(b.end)}`,
      revenueNum: Number(b.revenue.toFixed(2)),
      costNum: Number(b.cost.toFixed(2)),
      profitNum: Number(b.profit.toFixed(2)),
      marginPercent: b.revenue > 0 ? ((b.profit / b.revenue) * 100).toFixed(2) : null,
      transactions: b.transactions,
    }));
  }, [daily, granularity]);

  return (
    <section
      aria-label="Evolução financeira"
      className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 min-w-0 flex flex-col justify-between"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold text-white">Evolução financeira</h2>
            <InfoBalloon
              align="left"
              title="Evolução financeira"
              description="Mostra barra a barra o comportamento da Receita Líquida (azul), Custo das Mercadorias — CMV (amarelo) e Lucro Real (verde). Alterne entre visão Diária e Semanal."
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Receita, CMV e lucro {granularity === 'daily' ? 'diários' : 'semanais'} no período selecionado (UTC−03:00).
          </p>
        </div>

        <div className="inline-flex bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setGranularity('daily')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              granularity === 'daily' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Diário
          </button>
          <button
            type="button"
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              granularity === 'weekly' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Semanal
          </button>
        </div>
      </div>

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={series}
            accessibilityLayer={false}
            barGap={3}
            barCategoryGap="22%"
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              width={54}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactYAxis}
            />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  revenueNum: 'Receita (faturamento)',
                  costNum: 'CMV (custo das mercadorias)',
                  profitNum: 'Lucro real',
                };
                return [money(Number(value ?? 0)), labels[String(name)] ?? String(name)];
              }}
              contentStyle={{
                background: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: 12,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#f4f4f5', fontWeight: 700, marginBottom: 4 }}
              cursor={{ fill: 'rgba(39, 39, 42, 0.45)' }}
            />
            <Bar
              dataKey="revenueNum"
              name="revenueNum"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            />
            <Bar
              dataKey="costNum"
              name="costNum"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            />
            <Bar
              dataKey="profitNum"
              name="profitNum"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda centralizada idêntica ao mockup */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-3 pt-2 text-xs text-zinc-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          Receita (faturamento)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          CMV (custo das mercadorias)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Lucro real
        </span>
      </div>

      <details className="mt-3 pt-2 border-t border-zinc-800/70">
        <summary className="cursor-pointer text-xs text-blue-400 hover:text-blue-300 py-1 font-medium select-none">
          Ver valores detalhados em tabela ({granularity === 'daily' ? 'por dia' : 'por semana'})
        </summary>
        <div className="overflow-auto max-h-72 mt-2">
          <table className="w-full text-xs sm:text-sm text-left">
            <caption className="sr-only">Vendas, custos e lucro no período</caption>
            <thead className="text-zinc-400 text-[11px] uppercase border-b border-zinc-800">
              <tr>
                <th scope="col" className="py-2 pr-3">Período</th>
                <th scope="col" className="py-2 px-2 text-right">Vendas</th>
                <th scope="col" className="py-2 px-2 text-right">Faturamento</th>
                <th scope="col" className="py-2 px-2 text-right">Custo (CMV)</th>
                <th scope="col" className="py-2 px-2 text-right">Lucro Real</th>
                <th scope="col" className="py-2 pl-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {series.map((row) => (
                <tr key={row.key} className="border-t border-zinc-800/70 hover:bg-zinc-800/30">
                  <td className="py-2 pr-3 whitespace-nowrap font-medium text-zinc-200">{row.fullLabel}</td>
                  <td className="py-2 px-2 text-right text-zinc-300">
                    {row.transactions.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap font-medium text-white">
                    {money(row.revenueNum)}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap text-amber-300">
                    {money(row.costNum)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right whitespace-nowrap font-semibold ${
                      row.profitNum >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {money(row.profitNum)}
                  </td>
                  <td className="py-2 pl-2 text-right whitespace-nowrap text-zinc-300">
                    {row.marginPercent !== null
                      ? `${Number(row.marginPercent).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function SalesEvolution({
  daily,
  comparison,
  includesOpenDays,
  currentRevenue,
  currentGrossProfit,
}: {
  daily: DailySales[];
  comparison: SalesComparison;
  includesOpenDays: boolean;
  currentRevenue?: string;
  currentGrossProfit?: string;
}) {
  const revSum =
    currentRevenue ??
    daily.reduce((acc, d) => acc + Number(d.revenue), 0).toFixed(2);
  const profitSum =
    currentGrossProfit ??
    daily.reduce((acc, d) => acc + Number(d.grossProfit ?? 0), 0).toFixed(2);

  return (
    <div className="space-y-4">
      <PeriodComparisonBar
        daily={daily}
        currentRevenue={revSum}
        currentGrossProfit={profitSum}
        comparison={comparison}
        includesOpenDays={includesOpenDays}
      />
      <FinancialEvolutionChart daily={daily} />
    </div>
  );
}
