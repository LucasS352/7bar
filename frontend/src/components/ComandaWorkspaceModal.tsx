import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  X,
  Plus,
  UtensilsCrossed,
  ReceiptText,
  Clock,
  User,
  ArrowRight,
  Trash2,
  RefreshCw,
  Loader2,
  UnlockKeyhole,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { readComandas, readComanda } from '@/lib/comandas-offline';
import { useCartStore } from '@/store/cart';
import { syncLoadedComanda } from '@/lib/comanda-cart';
import { kdsLabels, type KdsStatus } from '@/lib/kds';

type Item = {
  id: string;
  productId: string;
  product: { name: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  createdBy?: { name: string };
  modifiers?: { id: string; name: string }[];
  kdsStatus?: KdsStatus | null;
};
type Comanda = {
  id: string;
  number: string;
  customerName?: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  responsibleWaiter?: { name: string };
  items: Item[];
};
type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCharge: (comanda: Comanda) => void;
  onUpdated: (comanda: Comanda) => void;
  launch?: {
    number: string;
    customer: string;
    setNumber: (value: string) => void;
    setCustomer: (value: string) => void;
    quantity: number;
    total: number;
    busy: boolean;
    onConfirm: () => void;
  };
};
const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
function elapsed(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000),
  );
  return Number.isFinite(minutes)
    ? minutes < 60
      ? `${minutes} min`
      : `${Math.floor(minutes / 60)}h ${minutes % 60}min`
    : '—';
}

export function ComandaWorkspaceModal({
  selectedId,
  onSelect,
  onClose,
  onCharge,
  onUpdated,
  launch,
}: Props) {
  const tenantId = useAuthStore(state => state.user?.tenant) || '';
  const [offlineAt, setOfflineAt] = useState<number | null>(null);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [detail, setDetail] = useState<Comanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    kind: 'remove' | 'reopen' | 'charge';
    comanda: Comanda;
    item?: Item;
  } | null>(null);
  const [mobileDetail, setMobileDetail] = useState(selectedId === 'new');
  const panel = useRef<HTMLDivElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const selection = useRef(selectedId);
  selection.current = selectedId;
  const version = useRef(0);
  const detailVersion = useRef(0);
  const mutating = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const locked = useCartStore((state) => state.isOperationLocked);
  const disabled = busy || !!launch?.busy || locked;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const selected = detail?.id === selectedId ? detail : null;
  const isNew = !!launch && selectedId === 'new';

  const loadDetail = useCallback(async (id: string) => {
    const request = ++detailVersion.current;
    setDetailLoading(true);
    try {
      const res = await readComanda(tenantId, id);
      if (request === detailVersion.current && selection.current === id) {
        if (!['open', 'waiting_payment'].includes(res.data.status)) {
          setDetail(null);
          setError('Esta comanda foi encerrada. Selecione outra mesa.');
        } else {
          setDetail(res.data);
          setOfflineAt(res.offline ? res.savedAt : null);
          setError('');
        }
      }
    } catch (err: any) {
      if (request === detailVersion.current) {
        setDetail(null);
        setError(err.message || 'Não foi possível carregar os itens. Tente atualizar.');
      }
    } finally {
      if (request === detailVersion.current) setDetailLoading(false);
    }
  }, [tenantId]);

  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const request = ++version.current;
    try {
      const res = await readComandas(tenantId);
      if (request !== version.current) return;
      setComandas(res.items);
      setOfflineAt(res.offline ? res.savedAt : null);
      setError('');
      const id = selection.current;
      if (id && id !== 'new') await loadDetail(id);
    } catch {
      if (request === version.current)
        setError(
          'Não foi possível atualizar as comandas. Verifique a conexão e tente novamente.',
        );
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [loadDetail, tenantId]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      clearInterval(timer);
      version.current++;
      detailVersion.current++;
    };
  }, [refresh]);
  useEffect(() => {
    setDetail(null);
    detailVersion.current++;
    if (selectedId && selectedId !== 'new') void loadDetail(selectedId);
    else setDetailLoading(false);
  }, [selectedId, loadDetail]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => before?.focus();
  }, []);
  useEffect(() => {
    if (confirm) confirmation.current?.focus();
    else panel.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!disabledRef.current) {
          if (confirm) setConfirm(null);
          else onCloseRef.current();
        }
      }
      if (event.key === 'Tab') {
        const root = confirm ? confirmation.current : panel.current;
        const focusable = Array.from(
          root?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === root)
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [confirm]);

  function choose(id: string) {
    if (disabled) return;
    onSelect(id);
    setMobileDetail(true);
  }
  async function runAction(action: NonNullable<typeof confirm>) {
    if (
      mutating.current ||
      disabled ||
      useCartStore.getState().isOperationLocked
    )
      return;
    mutating.current = true;
    setBusy(true);
    version.current++;
    detailVersion.current++;
    try {
      if (action.kind === 'charge') {
        const res = await readComanda(tenantId, action.comanda.id);
        if (res.offline && !window.confirm(`Sem conexão: cópia de ${new Date(res.savedAt).toLocaleString('pt-BR')}. Confira os consumos com o garçom e concentre as cobranças em um único caixa durante a queda. Continuar com estes valores?`)) return;
        if (!['open', 'waiting_payment'].includes(res.data.status))
          throw new Error('Esta comanda já foi encerrada.');
        onCharge(res.data);
      } else {
        if (offlineAt || !navigator.onLine) throw new Error('Reconecte para alterar a comanda.');
        const res =
          action.kind === 'remove'
            ? await api.delete(
                `/v1/comandas/${action.comanda.id}/items/${action.item!.id}`,
              )
            : await api.post(`/v1/comandas/${action.comanda.id}/reopen`);
        setDetail(res.data);
        setComandas((list) =>
          list.map((c) => (c.id === res.data.id ? res.data : c)),
        );
        syncLoadedComanda(res.data);
        onUpdated(res.data);
        toast.success(
          action.kind === 'remove'
            ? 'Item removido. Total da comanda atualizado.'
            : 'Comanda reaberta para edição.',
        );
      }
      setConfirm(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err.message ||
          'Não foi possível concluir a ação.',
      );
      setConfirm(null);
      if (selection.current && selection.current !== 'new')
        await loadDetail(selection.current);
    } finally {
      mutating.current = false;
      setBusy(false);
      setLoading(false);
      setDetailLoading(false);
    }
  }
  function charge() {
    if (!selected) return;
    const action = { kind: 'charge' as const, comanda: selected };
    if (useCartStore.getState().items.length > 0) setConfirm(action);
    else void runAction(action);
  }
  const waiting = comandas.filter((c) => c.status === 'waiting_payment').length;
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const list = comandas
    .filter(
      (c) =>
        (filter === 'all' || c.status === filter) &&
        normalize(
          `${c.number} ${c.customerName || ''} ${c.responsibleWaiter?.name || ''}`,
        ).includes(normalize(search)),
    )
    .sort(
      (a, b) =>
        Number(b.status === 'waiting_payment') -
          Number(a.status === 'waiting_payment') ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-5 text-left">
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comanda-workspace-title"
        className="w-full max-w-6xl h-[92dvh] max-h-[900px] overflow-hidden flex flex-col rounded-3xl border border-zinc-700/70 bg-[#101317] text-white shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between gap-3 px-5 sm:px-7 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="hidden sm:grid w-12 h-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
              <UtensilsCrossed size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-amber-400 uppercase mb-1">
                PDV · Atendimento
              </p>
              <h2
                id="comanda-workspace-title"
                className="text-lg sm:text-2xl font-bold tracking-tight"
              >
                {launch ? 'Lançar em comanda' : 'Comandas e mesas'}
              </h2>
              <p className="hidden sm:block text-xs text-zinc-400 mt-1">
                {launch
                  ? 'Escolha o destino dos itens do carrinho.'
                  : 'Acompanhe o consumo, gerencie os itens e receba no caixa.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar comandas"
            onClick={onClose}
            disabled={disabled}
            className="rounded-xl p-3 bg-white/5 hover:bg-white/10 text-zinc-400 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </header>
        {offlineAt && <div role="status" className="bg-amber-500/15 px-5 py-3 text-sm text-amber-200">Sem conexão · cópia de {new Date(offlineAt).toLocaleString('pt-BR')}. Valores podem estar desatualizados. Use um único caixa para cobrar durante a queda. Cobranças deste aparelho ficam nas pendências.</div>}
        {error && (
          <div
            role="alert"
            className="px-5 py-3 text-sm text-red-200 bg-red-500/10 flex items-center justify-between gap-3"
          >
            {error}
            <button
              type="button"
              disabled={disabled}
              onClick={refresh}
              className="underline shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[1.1fr_1fr]">
          <section
            aria-label="Mesas disponíveis"
            className={`${mobileDetail ? 'hidden md:flex' : 'flex'} flex-col min-h-0 border-r border-white/5 p-4 sm:p-5 gap-4`}
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Abertas', comandas.length],
                ['Aguardando caixa', waiting],
                [
                  'Consumo total',
                  money(comandas.reduce((sum, c) => sum + Number(c.total), 0)),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-xl bg-white/[0.03] border border-white/5 p-3"
                >
                  <p className="text-[10px] sm:text-xs text-zinc-400">
                    {label}
                  </p>
                  <p className="text-sm sm:text-lg font-semibold mt-1 tabular-nums break-words">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="flex-1 min-w-0 relative">
                <Search
                  size={17}
                  className="absolute left-3 top-3.5 text-zinc-500"
                />
                <input
                  aria-label="Buscar comanda"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mesa, cliente ou garçom"
                  className="w-full rounded-xl border border-zinc-700/60 bg-black/25 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-400/60"
                />
              </label>
              <button
                type="button"
                aria-label="Atualizar comandas"
                disabled={disabled}
                onClick={refresh}
                className="p-3 rounded-xl border border-zinc-700/60 text-zinc-400"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Todas'],
                ['open', 'Em atendimento'],
                ['waiting_payment', 'Aguardando caixa'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition ${filter === value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <p role="status" className="py-12 text-center text-zinc-400">
                  <Loader2 className="inline animate-spin mr-2" size={18} />
                  Carregando comandas…
                </p>
              ) : !list.length ? (
                <div className="text-center py-14 text-zinc-500">
                  <ReceiptText size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {comandas.length
                      ? 'Nenhuma comanda corresponde à busca.'
                      : 'Nenhuma comanda aberta no momento.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {list.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      disabled={disabled}
                      onClick={() => choose(c.id)}
                      aria-pressed={selectedId === c.id}
                      aria-label={`Comanda ${c.number}`}
                      className={`text-left rounded-2xl border p-4 transition disabled:opacity-50 ${selectedId === c.id ? 'bg-amber-400/10 border-amber-400 shadow-[inset_0_0_0_1px_#fbbf24]' : 'bg-[#191e23] border-zinc-700/50 hover:border-zinc-500'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'waiting_payment' ? 'bg-orange-400' : 'bg-emerald-400'}`}
                        />
                        <span className="font-bold text-lg truncate">
                          #{c.number}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 truncate">
                        {c.customerName || 'Sem cliente informado'}
                      </p>
                      <p
                        className={`mt-3 text-[10px] font-semibold ${c.status === 'waiting_payment' ? 'text-orange-300' : 'text-emerald-400'}`}
                      >
                        {c.status === 'waiting_payment'
                          ? 'Aguardando caixa'
                          : 'Em atendimento'}
                      </p>
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-lg font-bold tabular-nums">
                          {money(c.total)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-zinc-500">
                          <span>{c.items.length} lançamento(s)</span>
                          <span className="flex gap-1 items-center">
                            <Clock size={11} />
                            {elapsed(c.createdAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {launch && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => choose('new')}
                className={`py-3 rounded-xl border border-dashed flex justify-center items-center gap-2 text-sm font-semibold ${isNew ? 'text-amber-300 border-amber-400/60 bg-amber-400/5' : 'text-zinc-300 border-zinc-600 hover:bg-white/5'}`}
              >
                <Plus size={18} />
                Nova comanda
              </button>
            )}
          </section>
          <section
            aria-label="Detalhes da comanda"
            className={`${mobileDetail ? 'flex' : 'hidden md:flex'} flex-col min-h-0 bg-[#14181d]`}
          >
            <div className="md:hidden px-4 pt-3">
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                disabled={disabled}
                className="text-sm text-zinc-300 flex gap-1 items-center py-2"
              >
                <ChevronLeft size={18} />
                Voltar às mesas
              </button>
            </div>
            {isNew ? (
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <span className="grid place-items-center w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-400 mb-5">
                  <Plus size={26} />
                </span>
                <h3 className="text-xl font-bold">Abrir nova comanda</h3>
                <p className="text-sm text-zinc-400 mt-2 mb-6">
                  Identifique a mesa ou o cliente para começar o atendimento.
                </p>
                <label className="block text-sm text-zinc-300">
                  Identificação da mesa / comanda{' '}
                  <span className="text-amber-400">*</span>
                  <input
                    value={launch.number}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        !disabled &&
                        !error &&
                        launch.number.trim()
                      ) {
                        event.preventDefault();
                        launch.onConfirm();
                      }
                    }}
                    onChange={(e) => launch.setNumber(e.target.value)}
                    placeholder="Ex.: Mesa 05, Balcão 2, Marcos"
                    className="mt-2 mb-5 w-full p-3 rounded-xl bg-black/25 border border-zinc-700 outline-none focus:border-amber-400"
                  />
                </label>
                <label className="block text-sm text-zinc-300">
                  Nome do cliente{' '}
                  <span className="text-zinc-500">(opcional)</span>
                  <input
                    value={launch.customer}
                    onChange={(e) => launch.setCustomer(e.target.value)}
                    placeholder="Como podemos chamar o cliente?"
                    className="mt-2 w-full p-3 rounded-xl bg-black/25 border border-zinc-700 outline-none focus:border-amber-400"
                  />
                </label>
              </div>
            ) : detailLoading && !selected ? (
              <div className="flex-1 grid place-items-center text-zinc-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : !selected ? (
              <div className="flex-1 flex flex-col justify-center items-center p-10 text-center">
                <div className="p-5 rounded-full bg-white/5 mb-5 text-zinc-500">
                  <ReceiptText size={38} />
                </div>
                <h3 className="text-lg font-semibold">Selecione uma comanda</h3>
                <p className="text-sm text-zinc-500 mt-2 max-w-xs">
                  Os itens consumidos e as ações de atendimento aparecem aqui.
                </p>
              </div>
            ) : (
              <>
                <div className="p-5 sm:p-6 border-b border-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                        Comanda selecionada
                      </p>
                      <h3 className="text-2xl font-bold break-all">
                        #{selected.number}
                      </h3>
                    </div>
                    <span
                      className={`rounded-lg px-2.5 py-1.5 text-xs ${selected.status === 'waiting_payment' ? 'bg-orange-400/10 text-orange-300' : 'bg-emerald-400/10 text-emerald-400'}`}
                    >
                      {selected.status === 'waiting_payment'
                        ? 'Aguardando caixa'
                        : 'Em atendimento'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-3">
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      {selected.customerName || 'Cliente não informado'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {elapsed(selected.createdAt)}
                    </span>
                    {selected.responsibleWaiter?.name && (
                      <span>Garçom: {selected.responsibleWaiter.name}</span>
                    )}
                  </div>
                </div>
                {selected.status === 'waiting_payment' && (
                  <div className="mx-5 mt-4 rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-xs text-orange-200">
                    <p>
                      Conta enviada ao caixa. Reabra para adicionar ou remover
                      itens.
                    </p>
                    <button
                      type="button"
                      disabled={disabled || detailLoading || !!offlineAt}
                      onClick={() =>
                        setConfirm({ kind: 'reopen', comanda: selected })
                      }
                      className="mt-2 font-bold flex items-center gap-1.5 underline"
                    >
                      <UnlockKeyhole size={14} />
                      Reabrir para editar
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-2 text-xs text-zinc-500 uppercase tracking-wider">
                  <span>Itens consumidos</span>
                  <span>{selected.items.length} lançamento(s)</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 sm:px-6">
                  {!selected.items.length ? (
                    <p className="py-12 text-center text-sm text-zinc-500">
                      Esta comanda ainda não possui itens.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {selected.items.map((item) => (
                        <li
                          key={item.id}
                          className="py-4 flex items-start gap-3"
                        >
                          <span className="mt-0.5 min-w-9 px-1 py-1.5 rounded-lg text-center text-xs font-bold bg-white/5 text-zinc-300">
                            {Number(item.quantity)}×
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold break-words">
                              {item.product?.name || 'Produto'}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {money(item.unitPrice)} / unidade
                              {item.createdBy?.name
                                ? ` · ${item.createdBy.name}`
                                : ''}
                            </p>
                            {item.modifiers?.map((m) => (
                              <p
                                key={m.id}
                                className="mt-1 text-xs text-zinc-400"
                              >
                                + {m.name}
                              </p>
                            ))}
                            {item.notes && (
                              <p className="mt-1 text-xs text-amber-200 whitespace-pre-wrap break-words">
                                {item.notes}
                              </p>
                            )}
                            {item.kdsStatus && (
                              <span
                                className={`inline-block text-[10px] rounded-md px-2 py-1 mt-2 ${item.kdsStatus === 'READY' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-zinc-400'}`}
                              >
                                {kdsLabels[item.kdsStatus]}
                              </span>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {money(item.totalPrice)}
                            </p>
                            <button
                              type="button"
                              aria-label={`Remover ${item.product?.name || 'item'}`}
                              disabled={
                                disabled ||
                                !!offlineAt ||
                                detailLoading ||
                                !!error ||
                                selected.status !== 'open'
                              }
                              onClick={() =>
                                setConfirm({
                                  kind: 'remove',
                                  comanda: selected,
                                  item,
                                })
                              }
                              className="p-2.5 -mr-2 mt-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0 border-t border-white/5 p-5 sm:p-6 bg-black/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-zinc-400">
                      Total da comanda
                    </span>
                    <strong className="text-2xl tracking-tight tabular-nums">
                      {money(selected.total)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    disabled={
                      disabled ||
                      detailLoading ||
                      !!error ||
                      !selected.items.length
                    }
                    onClick={charge}
                    className="w-full flex justify-center items-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm disabled:opacity-35"
                  >
                    <ReceiptText size={18} />
                    Cobrar no caixa
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
        {launch && (
          <footer className="shrink-0 border-t border-white/10 bg-[#191d22] px-5 sm:px-7 py-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <p className="text-xs text-zinc-400">
                Adicionar do carrinho · {launch.quantity} item(ns)
              </p>
              <p className="text-xl font-bold text-amber-300 tabular-nums mt-1">
                {money(launch.total)}
              </p>
            </div>
            <button
              type="button"
              disabled={
                disabled ||
                !!offlineAt ||
                !!error ||
                detailLoading ||
                (isNew
                  ? !launch.number.trim()
                  : !selected || selected.status !== 'open')
              }
              onClick={launch.onConfirm}
              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm flex gap-2 items-center disabled:opacity-35"
            >
              {launch.busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              Confirmar lançamento
            </button>
          </footer>
        )}
        {confirm && (
          <div className="absolute inset-0 z-10 flex justify-center items-center bg-black/75 p-4">
            <div
              ref={confirmation}
              tabIndex={-1}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="comanda-confirm-title"
              className="max-w-md w-full rounded-2xl border border-zinc-700 bg-[#1a1e24] p-6 shadow-2xl outline-none"
            >
              <AlertTriangle
                className={
                  confirm.kind === 'remove' ? 'text-red-400' : 'text-amber-400'
                }
                size={28}
              />
              <h3 id="comanda-confirm-title" className="mt-4 text-xl font-bold">
                {confirm.kind === 'remove'
                  ? 'Remover item da comanda?'
                  : confirm.kind === 'reopen'
                    ? 'Reabrir esta comanda?'
                    : 'Carregar comanda no caixa?'}
              </h3>
              <p className="text-sm text-zinc-300 mt-3">
                Comanda #{confirm.comanda.number}
                {confirm.item
                  ? ` · ${Number(confirm.item.quantity)}× ${confirm.item.product?.name} · ${money(confirm.item.totalPrice)}`
                  : ''}
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                {confirm.kind === 'remove'
                  ? 'O lançamento inteiro será removido e o estoque debitado será devolvido. A comanda continuará aberta.'
                  : confirm.kind === 'reopen'
                    ? 'A conta voltará ao atendimento para permitir alterações nos itens.'
                    : 'Os itens desta comanda substituirão o carrinho atual para iniciar a cobrança.'}
              </p>
              {confirm.item?.kdsStatus && (
                <p className="mt-3 text-xs text-amber-300">
                  Produção: {kdsLabels[confirm.item.kdsStatus]}. A remoção
                  também retira o item da fila do KDS.
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => runAction(confirm)}
                  className={`flex-1 py-3 rounded-xl font-bold text-zinc-950 disabled:opacity-50 ${confirm.kind === 'remove' ? 'bg-red-400' : 'bg-amber-400'}`}
                >
                  {busy
                    ? 'Aguarde…'
                    : confirm.kind === 'remove'
                      ? 'Remover item'
                      : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
