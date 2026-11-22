import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Package,
  Save,
  Search,
  X,
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

const formatBrDate = (isoDate: string) => {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
};

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

  // Fecha com Escape sem perder bloqueio durante salvamento em andamento
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingAll) {
        onBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack, savingAll]);

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

  const totalPeriodUncostedRevenue = useMemo(
    () => (data?.items ?? []).reduce((acc, item) => acc + Number(item.itemSubtotal ?? 0), 0),
    [data],
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
      onClick={() => {
        if (!savingAll) onBack();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="uncosted-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="uncosted-modal-title"
                className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
              >
                <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                <span>Produtos vendidos sem custo cadastrado</span>
              </h2>
              <InfoBalloon
                align="left"
                title="Cadastro Direto de Custo"
                description="Digite o custo unitário direto na linha de cada produto e clique em Salvar custos. Ao salvar, o sistema recalcula na hora o CMV, lucro real e margem das vendas sem sair desta tela."
              />
            </div>
            <p className="text-xs text-zinc-400">
              {scope === 'period'
                ? `Itens vendidos entre ${formatBrDate(startDate)} e ${formatBrDate(endDate)} com custo R$ 0,00${
                    totalPeriodUncostedRevenue > 0
                      ? ` (${money(totalPeriodUncostedRevenue)} em faturamento).`
                      : '.'
                  }`
                : 'Todos os produtos ativos do catálogo que ainda estão com preço de custo R$ 0,00.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => !savingAll && onBack()}
            aria-label="Fechar janela de custos"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controles compactos: Escopo + Busca + Categoria */}
        <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/40 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="grid grid-cols-2 sm:inline-flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setScope('period')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  scope === 'period'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <AlertTriangle size={13} />
                <span>No período ({data?.counts.inPeriod ?? '...'})</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('catalog')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  scope === 'catalog' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Package size={13} />
                <span>Todo catálogo ({data?.counts.catalog ?? '...'})</span>
              </button>
            </div>

            <div className="flex gap-2 flex-1 sm:max-w-sm">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filtrar produto, código ou EAN..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-8 pr-3 py-1.5 text-xs sm:text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label="Filtrar por categoria"
                className="bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-white max-w-[140px]"
              >
                <option value="">Categorias</option>
                {(data?.categories ?? []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista com input direto de Preço de Custo por linha */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80 bg-zinc-950/35">
          {error && (
            <div role="alert" className="m-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs sm:text-sm">
              {error}
            </div>
          )}

          {loading && !data ? (
            <div className="p-8 flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <Loader2 size={18} className="animate-spin text-amber-400" />
              Carregando produtos sem custo cadastrado…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                {searchInput || categoryId
                  ? 'Nenhum produto pendente encontrado neste filtro'
                  : scope === 'period'
                    ? 'Todos os produtos vendidos neste período já têm custo!'
                    : 'Todos os produtos ativos do catálogo têm preço de custo!'}
              </h3>
              <p className="text-xs text-zinc-400">
                {scope === 'period' && (data?.counts.catalog ?? 0) > 0
                  ? `Ainda existem ${data?.counts.catalog} itens no catálogo geral sem custo — clique em "Todo catálogo" acima se quiser preenchê-los agora.`
                  : 'Seus cálculos de CMV, Lucro Real e Margem estão atualizados.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
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
                <div
                  key={item.productId}
                  className="px-4 py-3 hover:bg-zinc-800/30 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3"
                >
                  {/* Produto + Qtd + Preço Venda + Prévia de margem */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ProductThumb src={item.imageUrl} alt={item.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-sm leading-snug truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {Number(item.soldQuantity) > 0
                          ? `Qtd vendida: ${formatQty(item.soldQuantity)} ${item.unit}`
                          : item.categoryName}
                        {' · '}
                        Venda: <span className="text-zinc-200 font-medium">{money(item.priceSell)}</span>
                      </p>
                      {parsed !== null && parsed > 0 && (
                        <p
                          className={`text-[11px] font-semibold mt-0.5 ${
                            costTooHigh ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {costTooHigh
                            ? `Custo maior ou igual ao preço de venda (${money(sellNum)})`
                            : `Lucro unitário: ${money(previewProfit)} · Margem: ${
                                previewMargin !== null ? previewMargin.toFixed(1).replace('.', ',') : '0'
                              }%`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Campo inline R$ + Botão rápido + Faturamento */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-12 sm:pl-0">
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-32 sm:w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold pointer-events-none">
                          R&#36;
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Custo 0,00"
                          aria-label={`Preço de custo de ${item.name}`}
                          value={rawVal}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [item.productId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (pendingChanges.length > 1) {
                                void saveAllDirty();
                              } else {
                                void saveSingle(item);
                              }
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-xl pl-8 pr-2.5 py-1.5 text-sm font-bold text-white text-right outline-none transition"
                        />
                      </div>

                      {parsed !== null && parsed > 0 && (
                        <button
                          type="button"
                          disabled={isSaving || savingAll}
                          onClick={() => void saveSingle(item)}
                          title="Salvar somente este item"
                          className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/35 transition cursor-pointer shrink-0"
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isSaved ? (
                            <Check size={14} />
                          ) : (
                            <Save size={14} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-right min-w-[78px]">
                      <p className="text-sm font-bold text-amber-300 tabular-nums">
                        {money(item.itemSubtotal)}
                      </p>
                      {Number(item.itemSubtotal) > 0 && (
                        <p className="text-[10px] text-zinc-500">no período</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <p className="text-[11px] text-zinc-400 hidden sm:block">
            {pendingChanges.length > 0 ? (
              <span className="text-emerald-300 font-semibold">
                {pendingChanges.length} {pendingChanges.length === 1 ? 'custo preenchido' : 'custos preenchidos'} pronto(s) para salvar
              </span>
            ) : (
              'Digite nos campos acima (Tab passa para o próximo produto).'
            )}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
            <Link
              to="/dashboard/inventory"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition"
            >
              Abrir Catálogo
            </Link>

            <button
              type="button"
              disabled={savingAll}
              onClick={onBack}
              className="px-3.5 py-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={pendingChanges.length === 0 || savingAll}
              onClick={() => void saveAllDirty()}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition ${
                pendingChanges.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
              }`}
            >
              {savingAll ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>
                Salvar custos{pendingChanges.length > 0 ? ` (${pendingChanges.length})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
