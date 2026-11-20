import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Package,
  Save,
  Search,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, apiGet } from '@/lib/api';
import { InfoBalloon } from '@/components/InfoBalloon';
import { ProductThumb } from '@/components/ProductThumb';

export interface UncostedEditorItem {
  productId: string;
  name: string;
  shortCode: string | null;
  barcode: string | null;
  unit: string;
  imageUrl?: string | null;
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

interface UncostedProductsResponse {
  period: { startDate: string; endDate: string; days: number; timezone: string };
  scope: 'period' | 'catalog';
  counts: { inPeriod: number; catalog: number };
  categories: { id: string; name: string }[];
  items: UncostedEditorItem[];
}

const money = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatQty = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

function parseCostInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

export function UncostedProductsView({
  startDate,
  endDate,
  initialScope = 'period',
  initialSearch = '',
  onBack,
  onSaved,
}: {
  startDate: string;
  endDate: string;
  initialScope?: 'period' | 'catalog';
  initialSearch?: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [scope, setScope] = useState<'period' | 'catalog'>(initialScope);
  const [categoryId, setCategoryId] = useState('');
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [data, setData] = useState<UncostedProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Mapa de inputs editados pelo usuário: productId -> texto digitado
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiGet<UncostedProductsResponse>('/reports/uncosted-products', {
      params: {
        startDate,
        endDate,
        scope,
        ...(categoryId ? { categoryId } : {}),
      },
      signal: controller.signal,
    })
      .then(({ data: res }) => {
        if (!controller.signal.aborted) {
          setData(res);
          setDrafts({});
          setSavedIds({});
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('Não foi possível carregar os produtos sem preço de custo.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [startDate, endDate, scope, categoryId, reloadTick]);

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const term = searchInput.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.barcode ?? '').toLowerCase().includes(term) ||
        (item.shortCode ?? '').toLowerCase().includes(term),
    );
  }, [data, searchInput]);

  const pendingChanges = useMemo(() => {
    const result: { productId: string; priceCost: number; name: string }[] = [];
    for (const item of data?.items ?? []) {
      const raw = drafts[item.productId];
      if (raw === undefined) continue;
      const parsed = parseCostInput(raw);
      if (parsed !== null && parsed > 0) {
        result.push({ productId: item.productId, priceCost: parsed, name: item.name });
      }
    }
    return result;
  }, [data, drafts]);

  async function saveSingle(item: UncostedEditorItem) {
    const raw = drafts[item.productId] ?? '';
    const parsed = parseCostInput(raw);
    if (parsed === null || parsed <= 0) {
      toast.error(`Informe um custo maior que R$ 0,00 para "${item.name}".`);
      return;
    }

    setSavingIds((prev) => ({ ...prev, [item.productId]: true }));
    try {
      await api.patch('/reports/product-costs', {
        items: [{ productId: item.productId, priceCost: parsed }],
      });
      setSavedIds((prev) => ({ ...prev, [item.productId]: true }));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.productId];
        return next;
      });
      toast.success(`Custo de "${item.name}" salvo (${money(parsed)})!`);
      onSaved();
      setReloadTick((t) => t + 1);
    } catch {
      toast.error(`Erro ao salvar o custo de "${item.name}".`);
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.productId]: false }));
    }
  }

  async function saveAllDirty() {
    if (pendingChanges.length === 0) return;
    setSavingAll(true);
    try {
      const res = await api.patch<{ updatedCount: number }>('/reports/product-costs', {
        items: pendingChanges.map((c) => ({ productId: c.productId, priceCost: c.priceCost })),
      });
      const count = res.data?.updatedCount ?? pendingChanges.length;
      toast.success(`${count} preço(s) de custo salvo(s)! Lucro e margem recalculados.`);
      onSaved();
      setReloadTick((t) => t + 1);
    } catch {
      toast.error('Erro ao salvar os custos em lote.');
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <section className="space-y-4 w-full" aria-label="Cadastro rápido de preço de custo">
      {/* Top Action Header */}
      <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            <ArrowLeft size={14} /> Voltar para o Ranking
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Tag size={19} className="text-amber-400" />
              Produtos sem Preço de Custo
            </h2>
            <InfoBalloon
              align="left"
              title="Preenchimento Rápido de Custo"
              description="Digite o preço de custo unitário de cada produto. Assim que você salva, o sistema recalcula na hora o CMV, lucro real e margem de todas as vendas sem custo histórico daquele item."
            />
          </div>
          <p className="text-xs text-zinc-400">
            Use a tecla <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">Tab</kbd> para ir de um produto ao outro e clique em <strong>Salvar alterados</strong> ao terminar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={pendingChanges.length === 0 || savingAll}
            onClick={saveAllDirty}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition ${
              pendingChanges.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            {savingAll ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar alterados ({pendingChanges.length})
          </button>
        </div>
      </div>

      {/* Escopo + Filtros */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Tabs de escopo */}
        <div className="grid grid-cols-2 sm:inline-flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setScope('period')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              scope === 'period' ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={13.5} />
            <span>Vendidos no período ({data?.counts.inPeriod ?? '...'})</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('catalog')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              scope === 'catalog' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package size={13.5} />
            <span>Todo o catálogo ({data?.counts.catalog ?? '...'})</span>
          </button>
        </div>

        {/* Busca + Categoria */}
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 lg:max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtrar produto, código ou código de barras..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white sm:w-48"
          >
            <option value="">Todas as categorias</option>
            {(data?.categories ?? []).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center gap-2 text-zinc-400 text-sm">
          <Loader2 size={18} className="animate-spin text-amber-400" />
          Carregando produtos sem custo cadastrado…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {searchInput || categoryId
              ? 'Nenhum produto pendente encontrado para este filtro'
              : scope === 'period'
                ? 'Todos os produtos vendidos neste período já têm custo!'
                : 'Todos os produtos ativos do catálogo têm preço de custo!'}
          </h3>
          <p className="text-xs text-zinc-400">
            {scope === 'period' && (data?.counts.catalog ?? 0) > 0
              ? `Ainda existem ${data?.counts.catalog} itens no catálogo geral sem custo — clique em "Todo o catálogo" se quiser revisá-los também.`
              : 'Seus cálculos de CMV, Lucro Real e Margem estão com cobertura completa.'}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Cards Mobile (< md) */}
          <div className="md:hidden divide-y divide-zinc-800/80">
            {filteredItems.map((item) => {
              const rawVal = drafts[item.productId] ?? '';
              const parsed = parseCostInput(rawVal);
              const sellNum = Number(item.priceSell);
              const previewProfit = parsed !== null ? sellNum - parsed : null;
              const previewMargin =
                parsed !== null && sellNum > 0 ? ((sellNum - parsed) / sellNum) * 100 : null;
              const isSaving = Boolean(savingIds[item.productId]);
              const isSaved = Boolean(savedIds[item.productId]);
              const costTooHigh = parsed !== null && sellNum > 0 && parsed >= sellNum;

              return (
                <div key={item.productId} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm leading-snug">{item.name}</p>
                        <p className="text-[11px] text-zinc-400">
                          {item.categoryName}
                          {item.currentStock !== null ? ` · Est: ${formatQty(item.currentStock)} ${item.unit}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-zinc-500 uppercase">Venda</p>
                      <p className="text-sm font-bold text-white">{money(item.priceSell)}</p>
                    </div>
                  </div>

                  {Number(item.itemSubtotal) > 0 && (
                    <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                      Vendido no período: {formatQty(item.soldQuantity)} {item.unit} ({money(item.itemSubtotal)})
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">
                        R&#36;
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={rawVal}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [item.productId]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveSingle(item);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={parsed === null || parsed <= 0 || isSaving}
                      onClick={() => void saveSingle(item)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shrink-0 ${
                        isSaved
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                          : parsed !== null && parsed > 0
                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : isSaved ? <Check size={14} /> : <Save size={14} />}
                      {isSaved ? 'Salvo' : 'Salvar'}
                    </button>
                  </div>

                  {parsed !== null && parsed > 0 && (
                    <p className={`text-xs font-medium ${costTooHigh ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {costTooHigh
                        ? `Atenção: custo maior ou igual ao preço de venda (${money(sellNum)})!`
                        : `Lucro unitário: ${money(previewProfit)} · Margem: ${previewMargin !== null ? previewMargin.toFixed(1).replace('.', ',') : '0'}%`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabela Desktop (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-950/40">
                <tr>
                  <th className="py-3 px-4">Produto / Categoria</th>
                  <th className="py-3 px-3 text-right">Estoque</th>
                  <th className="py-3 px-3 text-right">Vendas no período</th>
                  <th className="py-3 px-3 text-right">Preço Venda</th>
                  <th className="py-3 px-3 w-44">Inserir Custo (R&#36;)</th>
                  <th className="py-3 px-3">Prévia Lucro &amp; Margem</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const rawVal = drafts[item.productId] ?? '';
                  const parsed = parseCostInput(rawVal);
                  const sellNum = Number(item.priceSell);
                  const previewProfit = parsed !== null ? sellNum - parsed : null;
                  const previewMargin =
                    parsed !== null && sellNum > 0 ? ((sellNum - parsed) / sellNum) * 100 : null;
                  const isSaving = Boolean(savingIds[item.productId]);
                  const isSaved = Boolean(savedIds[item.productId]);
                  const costTooHigh = parsed !== null && sellNum > 0 && parsed >= sellNum;

                  return (
                    <tr key={item.productId} className="border-t border-zinc-800/80 hover:bg-zinc-800/25">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500">
                              {item.categoryName}
                              {item.shortCode ? ` · Cód. ${item.shortCode}` : ''}
                              {item.barcode ? ` · EAN ${item.barcode}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap text-zinc-300 tabular-nums">
                        {item.currentStock !== null ? `${formatQty(item.currentStock)} ${item.unit}` : 'Combo'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                        {Number(item.itemSubtotal) > 0 ? (
                          <div>
                            <p className="font-semibold text-amber-300">{money(item.itemSubtotal)}</p>
                            <p className="text-[11px] text-zinc-500">
                              {formatQty(item.soldQuantity)} {item.unit} ({item.salesCount} v)
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">Sem venda no período</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-white tabular-nums">
                        {money(item.priceSell)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">
                            R&#36;
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-label={`Preço de custo de ${item.name}`}
                            value={rawVal}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [item.productId]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveSingle(item);
                              }
                            }}
                            className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 rounded-xl pl-8 pr-2.5 py-1.5 text-sm font-bold text-white outline-none"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        {parsed === null || parsed <= 0 ? (
                          <span className="text-zinc-500">Digite o custo ao lado</span>
                        ) : costTooHigh ? (
                          <span className="text-rose-400 font-semibold">
                            Custo &ge; venda ({money(previewProfit)})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">
                            {money(previewProfit)} ({previewMargin !== null ? previewMargin.toFixed(1).replace('.', ',') : '0'}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={parsed === null || parsed <= 0 || isSaving}
                          onClick={() => void saveSingle(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                            isSaved
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                              : parsed !== null && parsed > 0
                                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : isSaved ? (
                            <Check size={13} />
                          ) : (
                            <Save size={13} />
                          )}
                          {isSaved ? 'Salvo' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
