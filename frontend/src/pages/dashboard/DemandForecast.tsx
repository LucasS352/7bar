import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Projection {
  key: string;
  start: string;
  end: string;
  insufficient: number;
  items: {
    id: string;
    name: string;
    unit: string;
    last7: number;
    last30: number;
    last90: number;
    inventory: {
      stock: number;
      pending: number;
      required: number;
      minimum: number;
    } | null;
    daily: number;
    estimate: number;
    low: number;
    high: number;
    trend: string;
    confidence: string;
  }[];
}

interface Forecast {
  start: string;
  end: string;
  insufficientNames: string[];
  planner: {
    id: string;
    name: string;
    unit: string;
    sold30: number;
    inventory: { stock: number; minimum: number; pending: number } | null;
  }[];
  projections: Projection[];
}

const date = (value: string) => value.split('-').reverse().join('/');
const qty = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function DemandForecast({ includeStock, onStockChange }: { includeStock: boolean; onStockChange: (value: boolean) => void }) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [horizon, setHorizon] = useState('7');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [purchaseDays, setPurchaseDays] = useState(30);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setForecast(null);
    apiGet<Forecast>('/reports/adega-insights/forecast', {
      params: { includeStock },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setForecast(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt, includeStock]);
  const projection = forecast?.projections.find((p) => p.key === horizon);
  const changingProduct = projection?.items.find((item) => item.trend !== 'Estável');
  const calculatedDays = Number.isFinite(purchaseDays) ? Math.max(1, Math.min(90, purchaseDays)) : 30;
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-white">Planejamento de compra e previsão de demanda</h2>
        <select
          aria-label="Horizonte da previsão"
          className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-white"
          value={horizon}
          onChange={(event) => setHorizon(event.target.value)}
        >
          <option value="7">7 dias</option>
          <option value="14">14 dias</option>
          <option value="30">30 dias</option>
          <option value="weekend">Próximo fim de semana</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={includeStock} onChange={(event) => onStockChange(event.target.checked)} />
        Considerar saldo de estoque e pedidos enviados na sugestão de compra
      </label>
      {error ? (
        <p role="alert">
          Falha ao carregar a previsão.{' '}
          <button className="text-sky-400" onClick={() => setAttempt((n) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      ) : !projection || !forecast ? (
        <p role="status">Calculando demanda…</p>
      ) : (
        <>
          <div className="rounded-xl border border-sky-900/60 bg-sky-950/20 p-4">
            <label className="flex flex-wrap items-center gap-2 text-sm text-white">
              Quero comprar para
              <input
                type="number"
                min="1"
                max="90"
                value={purchaseDays}
                onChange={(event) => setPurchaseDays(Number(event.target.value))}
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white"
              />
              dias
            </label>
            <p className="mt-2 text-xs text-zinc-400">
              Base de compra: unidades vendidas nos últimos 30 dias completos. Estimativa proporcional para{' '}
              {calculatedDays} dias.
            </p>
            {forecast.planner.length ? (
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-zinc-400">
                    <tr>
                      <th className="p-2">Produto</th>
                      <th className="p-2 text-right">Vendidos em 30 dias</th>
                      <th className="p-2 text-right">Previsão para {calculatedDays} dias</th>
                      {includeStock && <th className="p-2 text-right">Compra sugerida</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.planner.map((item) => {
                      const demand = Math.ceil((item.sold30 * calculatedDays) / 30);
                      const purchase = item.inventory
                        ? Math.max(
                            0,
                            demand +
                              item.inventory.minimum -
                              Math.max(0, item.inventory.stock) -
                              item.inventory.pending,
                          )
                        : null;
                      return (
                        <tr key={item.id} className="border-t border-zinc-800">
                          <th className="p-2 text-white">
                            {item.name} · {item.unit}
                          </th>
                          <td className="p-2 text-right">{qty(item.sold30)}</td>
                          <td className="p-2 text-right font-semibold text-sky-300">≈ {qty(demand)}</td>
                          {includeStock && (
                            <td className="p-2 text-right">
                              {purchase === null ? 'Saldo não confirmado' : qty(Math.ceil(purchase))}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">Nenhuma venda registrada nos últimos 30 dias completos.</p>
            )}
          </div>
          <h3 className="font-semibold text-white">Tendência por dia da semana</h3>
          <p className="text-xs text-zinc-400">
            Projeção de {date(projection.start)} a {date(projection.end)} · Vendas de {date(forecast.start)} a{' '}
            {date(forecast.end)}. Vendas agrupadas por dia da semana, com maior peso para as últimas semanas.
          </p>
          {projection.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-xs text-zinc-400">
                  <tr>
                    {[
                      'Produto',
                      'Vendas em 7 / 30 / 90 dias',
                      'Média diária',
                      'Demanda estimada',
                      'Faixa histórica estimada',
                      'Tendência',
                      'Confiança',
                      ...(includeStock ? ['Saldo / Mínimo / Em pedido', 'Reposição estimada'] : []),
                    ].map((h) => (
                      <th className="p-2" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projection.items.map((p) => (
                    <tr key={p.id} className="border-t border-zinc-800">
                      <th className="p-2 text-white">
                        {p.name} · {p.unit}
                      </th>
                      <td className="p-2">{[p.last7, p.last30, p.last90].map(qty).join(' / ')}</td>
                      <td className="p-2">{qty(p.daily)}</td>
                      <td className="p-2 font-bold text-sky-300">≈ {qty(Math.round(p.estimate * 10) / 10)}</td>
                      <td className="p-2">
                        {qty(Math.floor(p.low))} – {qty(Math.ceil(p.high))}
                      </td>
                      <td className="p-2">{p.trend}</td>
                      <td className="p-2">{p.confidence}</td>
                      {includeStock && (
                        <>
                          <td className="p-2">
                            {p.inventory
                              ? [p.inventory.stock, p.inventory.minimum, p.inventory.pending].map(qty).join(' / ')
                              : 'Sem saldo confirmado'}
                          </td>
                          <td className="p-2">{p.inventory ? qty(p.inventory.required) : '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {includeStock && (
            <p className="text-xs text-zinc-400">
              A reposição cobre a demanda até o fim da projeção e o mínimo cadastrado. Considera o saldo disponível e os
              pedidos enviados, supondo que cheguem a tempo.
            </p>
          )}
          {changingProduct && (
            <p className="text-xs text-zinc-300">
              {changingProduct.name} vendeu {qty(changingProduct.last7)} {changingProduct.unit} nos últimos 7 dias.{' '}
              {changingProduct.trend === 'Em alta'
                ? 'A média diária subiu frente às semanas anteriores. Considere a alta ao planejar os próximos pedidos.'
                : 'A média diária caiu frente às semanas anteriores. Revise a procura antes da próxima compra.'}
            </p>
          )}
          {(!projection.items.length || projection.insufficient > 0) && (
            <p className="text-xs text-zinc-400">
              Histórico insuficiente
              {projection.insufficient ? ' para ' + projection.insufficient + ' produto(s)' : ''}. A projeção exige
              vendas em pelo menos quatro dias e histórico de três semanas por produto.{' '}
              {forecast.insufficientNames.join(' · ')}
            </p>
          )}
        </>
      )}
    </section>
  );
}
