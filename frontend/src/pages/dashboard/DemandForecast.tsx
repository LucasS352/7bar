import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Box, CalendarDays, Check, ChevronRight, ClipboardList, Cloud, Copy, ExternalLink, FileText, Info, Package, Plus, RefreshCw, Search, ShoppingCart, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { buildPurchaseMessage, emptyPurchaseDraft, parsePurchaseDraft, purchaseDraftKey, suggestedPurchase, type PurchaseDraft, type PurchaseDraftItem } from '@/lib/purchase-draft';

interface Projection {
  key: string;
  start: string;
  end: string;
  insufficient: number;
  items: {
    id: string; name: string; unit: string; last7: number; last30: number; last90: number;
    inventory: { stock: number; pending: number; required: number; minimum: number } | null;
    daily: number; estimate: number; low: number; high: number; trend: string; confidence: string;
  }[];
}

interface PlannerItem {
  id: string;
  name: string;
  unit: string;
  sold30: number;
  inventory: { stock: number; minimum: number; pending: number } | null;
}

interface Forecast {
  start: string;
  end: string;
  insufficientNames: string[];
  planner: PlannerItem[];
  projections: Projection[];
}

interface CatalogProduct { id: string; name: string; unit?: string | null; active?: boolean }

const date = (value: string) => value.split('-').reverse().join('/');
const qty = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const periods = [
  { key: '7', label: '7 dias' }, { key: '14', label: '14 dias' },
  { key: '30', label: '30 dias' }, { key: 'weekend', label: 'Fim de semana' },
];

function readDraft(key: string | null): PurchaseDraft {
  if (!key || typeof window === 'undefined') return emptyPurchaseDraft();
  try { return parsePurchaseDraft(window.localStorage.getItem(key)); }
  catch { return emptyPurchaseDraft(); }
}

export function DemandForecast({ includeStock, onStockChange }: { includeStock: boolean; onStockChange: (value: boolean) => void }) {
  const user = useAuthStore((state) => state.user);
  const storageKey = purchaseDraftKey(user?.tenant, user?.id);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [horizon, setHorizon] = useState('30');
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<PurchaseDraft>(() => readDraft(storageKey));
  const [daysInput, setDaysInput] = useState(() => String(readDraft(storageKey).days));
  const [storageError, setStorageError] = useState(false);
  const [search, setSearch] = useState('');
  const [catalogResults, setCatalogResults] = useState<CatalogProduct[]>([]);
  const [catalogError, setCatalogError] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    apiGet<Forecast>('/reports/adega-insights/forecast', { params: { includeStock }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setForecast(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt, includeStock]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [draft, storageKey]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCatalogError(false);
      apiGet<{ data: CatalogProduct[] }>('/products', {
        params: { search: term, limit: 30 }, signal: controller.signal,
      }).then(({ data }) => {
        if (!controller.signal.aborted) setCatalogResults((data.data ?? []).filter((item) => item.active !== false));
      }).catch(() => { if (!controller.signal.aborted) setCatalogError(true); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);

  const projection = forecast?.projections.find((item) => item.key === horizon);
  const days = draft.days;
  const planner = forecast?.planner ?? [];
  const byId = new Map(planner.map((item) => [item.id, item]));
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const candidates: PlannerItem[] = [
    ...planner.filter((item) => !term || `${item.name} ${item.unit}`.toLocaleLowerCase('pt-BR').includes(term)),
    ...(term.length >= 2 ? catalogResults
      .filter((item) => !byId.has(item.id) && item.name.toLocaleLowerCase('pt-BR').includes(term))
      .map((item) => ({ id: item.id, name: item.name, unit: item.unit || 'UN', sold30: 0, inventory: null })) : []),
  ];
  const demandUnits = planner.filter((item) => item.unit.toUpperCase() === 'UN').reduce((total, item) => total + Math.ceil(item.sold30 * days / 30), 0);
  const attention = (projection?.insufficient ?? 0) + (projection?.items.filter((item) => item.confidence === 'Baixa').length ?? 0);
  const message = draft.items.length ? buildPurchaseMessage(draft) : '';
  const whatsappUrl = message ? `https://wa.me/?text=${encodeURIComponent(message)}` : '';

  const addItem = (item: PlannerItem) => {
    const suggested = suggestedPurchase(item.sold30, days, item.inventory, includeStock);
    setDraft((current) => {
      if (current.items.some((row) => row.productId === item.id)) return current;
      return { ...current, items: [...current.items, {
        productId: item.id, name: item.name, unit: item.unit, quantity: Math.max(1, suggested),
      }] };
    });
  };
  const updateQuantity = (productId: string, value: number) => {
    if (!Number.isFinite(value)) return;
    const quantity = Math.max(0.001, Math.min(1_000_000, Math.round(value * 1000) / 1000));
    setDraft((current) => ({ ...current, items: current.items.map((item) => item.productId === productId ? { ...item, quantity } : item) }));
  };
  const removeItem = (productId: string) => setDraft((current) => ({ ...current, items: current.items.filter((item) => item.productId !== productId) }));
  const copyMessage = async () => {
    try { await navigator.clipboard.writeText(message); setCopyStatus('Lista copiada.'); }
    catch { setCopyStatus('Não foi possível copiar. Use o botão do WhatsApp.'); }
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5 pb-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingCart size={20} className="text-sky-400" /> Previsão e plano de compra</h2>
            <p className="text-xs text-zinc-400 mt-1">Estime a demanda e monte seu rascunho sem sair do relatório.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 w-full sm:w-auto">Horizonte da análise</span>
            <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-950 border border-zinc-800 p-1">
              {periods.map((period) => <button key={period.key} type="button" onClick={() => setHorizon(period.key)}
                aria-pressed={horizon === period.key}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${horizon === period.key ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>{period.label}</button>)}
            </div>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5">
              <RefreshCw size={14} /> Atualizar previsão
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-zinc-800 pt-3">
          <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
            <input type="checkbox" checked={includeStock} onChange={(event) => onStockChange(event.target.checked)} className="accent-blue-600 size-4" />
            Considerar estoque e pedidos enviados
          </label>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <p className="text-xs text-zinc-400">Base: vendas dos últimos 30 dias completos · tendências: até 90 dias</p>
          <a href="#purchase-draft" className="sm:ml-auto text-xs font-semibold text-sky-400 hover:text-sky-300">Meu rascunho ({draft.items.length}) <ChevronRight size={13} className="inline" /></a>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">Falha ao carregar a previsão. <button className="underline" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button></div>}
      {!forecast && !error && <p role="status" className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-300">Calculando demanda…</p>}

      {forecast && <>
        <section aria-label="Resumo da previsão" className="space-y-2">
          <h3 className="font-bold text-white flex items-center gap-2"><BarChart3 size={17} className="text-sky-400" /> Resumo da previsão</h3>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <SummaryCard icon={<CalendarDays size={19} />} label="Planejamento" value={`${days} dias`} detail="Horizonte do rascunho" color="blue" />
            <SummaryCard icon={<Package size={19} />} label="Produtos com vendas" value={qty(planner.length)} detail="Últimos 30 dias completos" color="green" />
            <SummaryCard icon={<BarChart3 size={19} />} label="Demanda em UN" value={`${qty(demandUnits)} un`} detail={`Estimativa para ${days} dias`} color="blue" />
            <SummaryCard icon={<AlertTriangle size={19} />} label="Itens para revisar" value={qty(attention)} detail="Destaques com baixa confiança ou pouco histórico" color="amber" />
          </div>
        </section>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(430px,0.95fr)] 2xl:grid-cols-[minmax(0,1.55fr)_minmax(500px,1fr)]">
          <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden">
            <div className="border-b border-zinc-800 px-4 py-3 sm:px-5">
              <h3 className="font-bold text-white flex items-center gap-2"><ShoppingCart size={17} className="text-blue-400" /> Sugestão de compra</h3>
              <p className="text-xs text-zinc-400 mt-1">Escolha os produtos e ajuste livremente as quantidades no seu rascunho.</p>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="text-xs text-zinc-300 font-medium">Quero comprar para
                  <span className="flex items-center gap-2 mt-1"><input type="number" min="1" max="90" inputMode="numeric" value={daysInput}
                    onChange={(event) => {
                      setDaysInput(event.target.value);
                      const value = Number(event.target.value);
                      if (Number.isInteger(value) && value >= 1 && value <= 90) setDraft((current) => ({ ...current, days: value }));
                    }}
                    onBlur={() => setDaysInput(String(days))}
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base text-white" /> dias</span>
                </label>
                <p className="text-xs text-zinc-400 sm:pb-2">A previsão usa as vendas dos últimos 30 dias; com estoque confirmado, desconta saldo e pedidos enviados.</p>
              </div>
              <label className="relative block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto na previsão ou no catálogo"
                  aria-label="Buscar produto para adicionar ao rascunho" className="w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-3 py-2.5 text-base text-white placeholder:text-zinc-500" />
              </label>
              {catalogError && <p role="alert" className="text-xs text-amber-300">Busca no catálogo indisponível. Os produtos da previsão ainda podem ser selecionados.</p>}
              <div className="max-h-[550px] overflow-y-auto overscroll-contain divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950/50">
                {candidates.length === 0 && <p className="p-5 text-sm text-zinc-400">{term ? 'Nenhum produto encontrado. Tente outro nome.' : 'Sem vendas nos últimos 30 dias. Busque um produto do catálogo para montar a lista.'}</p>}
                {candidates.map((item) => {
                  const selected = draft.items.some((row) => row.productId === item.id);
                  const demand = Math.ceil(item.sold30 * days / 30);
                  const suggested = suggestedPurchase(item.sold30, days, item.inventory, includeStock);
                  return <div key={item.id} className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-zinc-800/30">
                    <div className="min-w-0 sm:flex-1"><p className="text-sm font-semibold text-white break-words">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.unit}{item.sold30 === 0 ? ' · Sem vendas na base' : ''}</p></div>
                    <div className="grid grid-cols-3 gap-2 sm:w-[240px] 2xl:w-[290px] text-xs">
                      <div><p className="text-zinc-500">Vendeu / 30d</p><p className="text-zinc-200 font-semibold">{qty(item.sold30)}</p></div>
                      <div><p className="text-zinc-500">Previsto / {days}d</p><p className="text-sky-300 font-semibold">≈ {qty(demand)}</p></div>
                      <div><p className="text-zinc-500">{includeStock && item.inventory ? 'Sugerido' : 'Base'}</p><p className="text-blue-300 font-bold">{qty(suggested)}</p></div>
                    </div>
                    <button type="button" onClick={() => addItem(item)} disabled={selected}
                      aria-label={selected ? `${item.name} já está no rascunho` : `Adicionar ${item.name} ao rascunho`}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 sm:min-w-[100px] ${selected ? 'bg-emerald-500/15 text-emerald-300 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                      {selected ? <><Check size={14} /> Adicionado</> : <><Plus size={14} /> Adicionar</>}
                    </button>
                  </div>;
                })}
              </div>
              <p className="text-xs text-zinc-500">A sugestão é uma referência. Revise embalagem, validade, estoque físico e necessidade real antes de comprar.</p>
            </div>
          </section>

          <aside id="purchase-draft" className="@container min-w-0 scroll-mt-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-2xl border border-blue-500/50 bg-gradient-to-b from-blue-950/35 via-zinc-950/95 to-zinc-950 p-4 sm:p-5 space-y-3.5 shadow-[0_0_24px_rgba(37,99,235,0.12)]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-blue-500/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-sky-400 shrink-0">
                    <ClipboardList size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-base leading-tight">Meu pedido de compra</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Rascunho pessoal · {draft.items.length} {draft.items.length === 1 ? 'produto' : 'produtos'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/25 border border-blue-500/40 px-2.5 py-1 text-xs font-semibold text-white">
                    <Package size={13} className="text-sky-300" />
                    <span>{draft.items.length} {draft.items.length === 1 ? 'item' : 'itens'}</span>
                  </span>
                  {draft.items.length > 0 && (
                    <>
                      <span className="h-4 w-px bg-zinc-700/80" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => { if (window.confirm('Limpar todos os itens deste rascunho?')) setDraft((current) => ({ ...current, items: [] })); }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-rose-300 transition cursor-pointer"
                        aria-label="Limpar rascunho"
                      >
                        <Trash2 size={14} />
                        <span>Limpar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {draft.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-400">
                  <ShoppingCart className="mx-auto mb-2 text-zinc-600" />
                  Adicione produtos da lista ao lado para montar seu pedido.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 overscroll-contain custom-scrollbar">
                  {draft.items.map((item: PurchaseDraftItem) => {
                    const current = byId.get(item.productId);
                    const suggestion = current ? suggestedPurchase(current.sold30, days, current.inventory, includeStock) : null;
                    return (
                      <div
                        key={item.productId}
                        className="rounded-xl border border-zinc-800/90 bg-zinc-950/85 px-2.5 py-2.5 flex flex-col @[410px]:flex-row @[410px]:items-center gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="size-9 rounded-lg border border-zinc-700/80 bg-zinc-900/90 flex items-center justify-center text-zinc-300 shrink-0"
                            aria-hidden="true"
                          >
                            <Box size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-white leading-snug break-words">{item.name}</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                              {current ? `Vendeu ${qty(current.sold30)} ${item.unit} em 30 dias` : 'Sem dados atuais de venda'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between @[410px]:justify-end gap-2 shrink-0">
                          <span className="hidden @[410px]:block h-8 w-px bg-zinc-800" aria-hidden="true" />
                          <label className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-zinc-400 leading-none">Comprar</span>
                            <span className="mt-1 flex items-center gap-1">
                              <DraftQuantityInput item={item} onCommit={updateQuantity} />
                              <span className="text-xs font-medium text-zinc-300">{item.unit}</span>
                            </span>
                          </label>
                          {suggestion !== null && (
                            <>
                              <span className="hidden @[410px]:block h-8 w-px bg-zinc-800" aria-hidden="true" />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, Math.max(1, suggestion))}
                                className="text-center text-xs leading-tight text-sky-400 hover:text-sky-300 transition cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                <span className="block font-medium">Usar sugestão</span>
                                <span className="block font-bold mt-0.5">{qty(suggestion)} {item.unit}</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            aria-label={`Remover ${item.name}`}
                            className="shrink-0 p-1 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <FileText size={14} className="text-zinc-400" />
                  Observações para o rascunho
                </span>
                <textarea
                  value={draft.notes}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Ex.: conferir caixas fechadas e validade"
                  className="w-full min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-3 text-base sm:text-sm text-white placeholder:text-zinc-500 resize-y"
                />
              </label>

              <div
                role="status"
                className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 text-xs ${
                  storageError
                    ? 'border-amber-500/40 bg-amber-950/25 text-amber-200'
                    : 'border-blue-500/25 bg-blue-950/25 text-zinc-300'
                }`}
              >
                <Cloud size={15} className={storageError ? 'text-amber-400 shrink-0' : 'text-sky-400 shrink-0'} />
                <span>
                  {storageError
                    ? 'Não foi possível salvar neste navegador. Copie ou compartilhe a lista antes de sair.'
                    : 'Lista salva automaticamente neste navegador.'}
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {draft.items.length > 0 ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-center text-sm font-bold text-white flex items-center justify-center gap-2 transition"
                  >
                    <WhatsAppIcon />
                    <span>Abrir no WhatsApp</span>
                    <ExternalLink size={14} className="shrink-0" />
                  </a>
                ) : (
                  <span className="rounded-xl bg-zinc-800 px-3 py-2.5 text-center text-sm font-bold text-zinc-500 flex items-center justify-center gap-2">
                    <WhatsAppIcon />
                    <span>Abrir no WhatsApp</span>
                    <ExternalLink size={14} className="shrink-0" />
                  </span>
                )}
                <button
                  type="button"
                  disabled={!draft.items.length}
                  onClick={() => void copyMessage()}
                  className="rounded-xl border border-zinc-700 bg-zinc-950/90 hover:bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-200 disabled:text-zinc-600 flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <Copy size={15} />
                  <span>Copiar lista</span>
                </button>
              </div>
              {copyStatus && <p role="status" className="text-xs text-sky-300">{copyStatus}</p>}
              <p className="text-[11px] text-zinc-400 leading-relaxed text-center sm:text-left">
                No WhatsApp, escolha a conversa <strong className="text-zinc-200">Você</strong> para guardar a lista. O sistema apenas prepara a mensagem; você confirma o envio.
              </p>

              <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/60 p-3.5 text-xs text-zinc-300 space-y-1.5">
                <h4 className="font-bold text-sm text-white flex items-center gap-2 mb-2">
                  <Info size={16} className="text-sky-400 shrink-0" />
                  <span>Como interpretar</span>
                </h4>
                <p><strong className="text-sky-400">Vendeu:</strong> unidades registradas nos últimos 30 dias completos.</p>
                <p><strong className="text-sky-400">Previsto:</strong> proporção das vendas para os dias escolhidos.</p>
                <p><strong className="text-sky-400">Sugerido:</strong> desconta saldo e pedidos enviados quando esses dados estão disponíveis.</p>
              </div>
            </section>
          </aside>
        </div>

        {projection && <section className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden">
          <div className="p-4 border-b border-zinc-800"><h3 className="font-bold text-white flex items-center gap-2"><TrendingUp size={17} className="text-sky-400" /> Tendência por produto</h3>
            <p className="text-xs text-zinc-400 mt-1">Projeção de {date(projection.start)} a {date(projection.end)} · vendas de {date(forecast.start)} a {date(forecast.end)}. Maior peso para semanas recentes.</p></div>
          {projection.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
            <thead className="bg-zinc-950/70 text-zinc-400"><tr><th className="p-3">Produto</th><th className="p-3">Vendas 7 / 30 / 90d</th><th className="p-3 text-right">Média / dia</th><th className="p-3 text-right">Demanda</th><th className="p-3 text-right">Faixa histórica</th><th className="p-3">Tendência</th><th className="p-3">Confiança</th></tr></thead>
            <tbody>{projection.items.map((item) => <tr key={item.id} className="border-t border-zinc-800/80"><th className="p-3 text-white font-medium">{item.name} · {item.unit}</th>
              <td className="p-3 text-zinc-300">{[item.last7, item.last30, item.last90].map(qty).join(' / ')}</td>
              <td className="p-3 text-right">{qty(item.daily)}</td><td className="p-3 text-right font-bold text-sky-300">≈ {qty(item.estimate)}</td>
              <td className="p-3 text-right">{qty(Math.floor(item.low))} – {qty(Math.ceil(item.high))}</td>
              <td className={`p-3 font-semibold ${item.trend === 'Em alta' ? 'text-emerald-400' : item.trend === 'Em queda' ? 'text-rose-400' : 'text-zinc-300'}`}>
                {item.trend === 'Em alta' ? <TrendingUp size={13} className="inline mr-1" /> : item.trend === 'Em queda' ? <TrendingDown size={13} className="inline mr-1" /> : null}{item.trend}</td>
              <td className="p-3">{item.confidence}</td></tr>)}</tbody>
          </table></div> : <p className="p-5 text-sm text-zinc-400">Histórico insuficiente para esta análise.</p>}
          {(projection.insufficient > 0 || forecast.insufficientNames.length > 0) && <p className="border-t border-zinc-800 p-4 text-xs text-zinc-400">Histórico insuficiente para {projection.insufficient} produto(s). A previsão por tendência exige vendas em pelo menos quatro dias e três semanas de histórico. {forecast.insufficientNames.join(' · ')}</p>}
        </section>}
      </>}
    </div>
  );
}

function SummaryCard({ icon, label, value, detail, color }: { icon: React.ReactNode; label: string; value: string; detail: string; color: 'blue' | 'green' | 'amber' }) {
  const colors = { blue: 'border-blue-800/70 bg-blue-950/20 text-sky-400', green: 'border-emerald-800/70 bg-emerald-950/20 text-emerald-400', amber: 'border-amber-800/70 bg-amber-950/20 text-amber-400' };
  return <div className={`min-w-0 rounded-xl border p-3 sm:p-4 ${colors[color]}`}><div className="flex items-center gap-2 text-xs text-zinc-300">{icon}<span>{label}</span></div>
    <p className="mt-2 text-xl sm:text-2xl font-black text-white break-words">{value}</p><p className="text-xs text-zinc-400 mt-1">{detail}</p></div>;
}

function DraftQuantityInput({ item, onCommit }: { item: PurchaseDraftItem; onCommit: (productId: string, value: number) => void }) {
  const [raw, setRaw] = useState(String(item.quantity));
  useEffect(() => setRaw(String(item.quantity)), [item.quantity]);
  const commit = () => {
    const value = Number(raw.replace(',', '.'));
    if (raw.trim() && Number.isFinite(value) && value >= 0.001 && value <= 1_000_000) onCommit(item.productId, value);
    else setRaw(String(item.quantity));
  };
  return <input type="text" inputMode="decimal" value={raw} onChange={(event) => setRaw(event.target.value)} onBlur={commit}
    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
    aria-label={`Quantidade de ${item.name}`}
    className="w-16 rounded-lg border border-zinc-700/80 bg-zinc-950/90 px-2 py-1 text-base sm:text-sm font-medium text-white" />;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9.5 9.2c.2-.5.4-.5.6-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4 0 .6l-.4.5c-.1.1-.2.3-.1.5.4.7 1 1.3 1.7 1.7.2.1.4 0 .5-.1l.5-.4c.2-.1.4-.1.6 0l1.6.7c.3.1.4.3.4.5v.5c0 .2 0 .4-.5.6-.5.2-1.6.4-3-.2-1.7-.7-3.4-2.4-4.1-4.1-.6-1.4-.4-2.5-.2-3Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
