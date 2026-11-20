import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

function ChangeBadge({ diff, pct }: { diff: string; pct: string | null }) {
  const numDiff = Number(diff);
  const sign = numDiff > 0 ? '+' : '';
  const color = numDiff > 0 ? 'text-emerald-400' : numDiff < 0 ? 'text-rose-400' : 'text-zinc-300';
  return (
    <span className={`font-semibold ${color}`}>
      {sign}
      {money(numDiff)}
      {pct !== null && (
        <span className="ml-1 text-xs">
          ({Number(pct) > 0 ? '+' : ''}
          {Number(pct).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
        </span>
      )}
    </span>
  );
}

export function SalesEvolution({
  daily,
  comparison,
  includesOpenDays,
}: {
  daily: DailySales[];
  comparison: SalesComparison;
  includesOpenDays: boolean;
}) {
  const [chartMode, setChartMode] = useState<'profit_vs_cost' | 'revenue'>('profit_vs_cost');

  const chart = daily.map((day) => ({
    ...day,
    revenueNum: Number(day.revenue),
    costNum: Number(day.totalCost ?? 0),
    profitNum: Number(day.grossProfit ?? 0),
  }));

  return (
    <section className="space-y-4" aria-label="Evolução e comparação de vendas e lucro">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-white">Comparação com o período anterior</h2>
          <span className="text-xs text-zinc-400">
            De {dateLabel(comparison.startDate)} a {dateLabel(comparison.endDate)} · {comparison.days}{' '}
            {comparison.days === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        {(includesOpenDays || comparison.includesOpenDays) && (
          <p className="text-xs sm:text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            Comparação parcial: há dias ainda em andamento ou futuros no intervalo. O período anterior é consultado por dias completos.
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-zinc-400 text-xs">Faturamento anterior</p>
            <p className="font-bold text-base sm:text-lg text-white mt-0.5">{money(comparison.revenue)}</p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-zinc-400 text-xs">Lucro anterior</p>
            <p className="font-bold text-base sm:text-lg text-emerald-400 mt-0.5">{money(comparison.grossProfit ?? 0)}</p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-zinc-400 text-xs">Vendas anteriores</p>
            <p className="font-bold text-base sm:text-lg text-white mt-0.5">
              {comparison.transactions.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <p className="text-zinc-400 text-xs">Ticket médio anterior</p>
            <p className="font-bold text-base sm:text-lg text-white mt-0.5">{money(comparison.averageTicket)}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-zinc-800 pt-3 text-sm">
          <div>
            <span className="text-zinc-400">Variação do faturamento: </span>
            <ChangeBadge diff={comparison.revenueDifference} pct={comparison.revenueChangePercent} />
            {comparison.revenueChangePercent === null && (
              <span className="text-xs text-zinc-500 ml-1">(sem base positiva anterior)</span>
            )}
          </div>
          {comparison.grossProfitDifference !== undefined && (
            <div>
              <span className="text-zinc-400">Variação do lucro real: </span>
              <ChangeBadge
                diff={comparison.grossProfitDifference}
                pct={comparison.grossProfitChangePercent ?? null}
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-white">Evolução diária: Receita vs Custo vs Lucro</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Dias sem vendas aparecem zerados no intervalo selecionado (UTC−03:00).
            </p>
          </div>
          <div className="inline-flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('profit_vs_cost')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                chartMode === 'profit_vs_cost' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Custo &amp; Lucro
            </button>
            <button
              type="button"
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                chartMode === 'revenue' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Faturamento
            </button>
          </div>
        </div>

        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} accessibilityLayer={false} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => dateLabel(String(date)).slice(0, 5)}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                minTickGap={22}
              />
              <YAxis
                width={58}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={(value) => Number(value).toLocaleString('pt-BR', { notation: 'compact' })}
              />
              <Tooltip
                labelFormatter={(label) => dateLabel(String(label))}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    revenueNum: 'Faturamento Líquido',
                    costNum: 'Custo (CMV)',
                    profitNum: 'Lucro Real Bruto',
                  };
                  return [money(Number(value ?? 0)), labels[String(name)] ?? String(name)];
                }}
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                labelStyle={{ color: '#e4e4e7', fontWeight: 700, marginBottom: 4 }}
                cursor={{ fill: '#27272a' }}
              />
              {chartMode === 'profit_vs_cost' ? (
                <>
                  <Bar
                    dataKey="costNum"
                    name="costNum"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="profitNum"
                    name="profitNum"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <Bar
                  dataKey="revenueNum"
                  name="revenueNum"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 py-2 font-medium">
            Ver detalhamento diário (Receita, CMV, Lucro e Margem)
          </summary>
          <div className="overflow-auto max-h-80 mt-2">
            <table className="w-full text-sm text-left">
              <caption className="sr-only">Vendas, custos e lucro diário no período</caption>
              <thead className="text-zinc-400 text-xs uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 pr-3">Data</th>
                  <th scope="col" className="py-2.5 px-2 text-right">Vendas</th>
                  <th scope="col" className="py-2.5 px-2 text-right">Faturamento</th>
                  <th scope="col" className="py-2.5 px-2 text-right">Custo (CMV)</th>
                  <th scope="col" className="py-2.5 px-2 text-right">Lucro Real</th>
                  <th scope="col" className="py-2.5 pl-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((day) => (
                  <tr key={day.date} className="border-t border-zinc-800/80 hover:bg-zinc-800/30">
                    <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-zinc-200">{dateLabel(day.date)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-300">
                      {day.transactions.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap font-medium text-white">
                      {money(day.revenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap text-amber-300">
                      {money(day.totalCost ?? 0)}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right whitespace-nowrap font-semibold ${
                        Number(day.grossProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {money(day.grossProfit ?? 0)}
                    </td>
                    <td className="py-2.5 pl-2 text-right whitespace-nowrap text-zinc-300">
                      {day.marginPercent !== null && day.marginPercent !== undefined
                        ? `${Number(day.marginPercent).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}
