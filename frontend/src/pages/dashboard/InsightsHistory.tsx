import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Month {
  month: string;
  revenue: string;
  profit: string;
  transactions: number;
  partial: boolean;
}
const money = (value: string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function InsightsHistory() {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<Month[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open || months) return;
    const controller = new AbortController();
    setError(false);
    apiGet<Month[]>('/reports/adega-insights/history', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setMonths(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [open, months]);
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <button
        type="button"
        aria-expanded={open}
        className="font-bold text-white"
        onClick={() => setOpen((v) => !v)}
      >
        Histórico mensal de vendas {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-3 max-h-80 overflow-auto text-sm">
          {error ? (
            <p role="alert">Falha ao carregar. Feche e abra o histórico para tentar novamente.</p>
          ) : !months ? (
            <p role="status">Consultando histórico…</p>
          ) : months.length === 0 ? (
            <p>Sem vendas registradas.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="text-zinc-400">
                <tr>
                  <th>Mês</th>
                  <th>Vendas</th>
                  <th>Faturamento</th>
                  <th>Lucro bruto</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t border-zinc-800">
                    <th className="py-2">{m.month.split('-').reverse().join('/')}</th>
                    <td>{m.transactions}</td>
                    <td>{money(m.revenue)}</td>
                    <td>
                      {money(m.profit)}
                      {m.partial && ' (custo parcial)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
