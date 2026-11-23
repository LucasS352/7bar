"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import {
  History,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { CloseRegisterModal } from '@/components/CloseRegisterModal';

type CashRegister = {
  id: string;
  userId?: string;
  operator?: { id: string; name: string };
  code?: number;
  openingTime: string;
  closingTime?: string;
  openingValue: number;
  closingValue?: number;
  status: string;
  totalSales?: number;
  closingDetails?: any;
};

type RegisterStatusFilter = 'all' | 'open' | 'pending_audit' | 'closed';

function buildVisiblePages(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export default function CashRegistersHistoryPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RegisterStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const activeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== debouncedSearch) {
        setPage(1);
        setDebouncedSearch(normalized);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, debouncedSearch]);

  const fetchRegisters = useCallback(
    async (options?: { forceFresh?: boolean; signal?: AbortSignal }) => {
      const signal = options?.signal;
      if (hasLoadedOnceRef.current) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params: Record<string, string | number> = { page, limit };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        if (options?.forceFresh) params._t = Date.now();

        const res = await api.get('/cash-registers', {
          params,
          signal,
          skipCancelTelemetry: true,
        } as any);

        if (signal?.aborted) return;

        const payload = res.data;
        const rows: CashRegister[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
        const meta = Array.isArray(payload) ? null : payload?.meta;

        setRegisters(rows);
        setTotal(meta?.total ?? rows.length);
        setLastPage(meta?.lastPage ?? 1);
        if (meta?.page && meta.page !== page) {
          setPage(meta.page);
        }
        hasLoadedOnceRef.current = true;
      } catch (error: any) {
        if (signal?.aborted || axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
          return;
        }
        console.error(error);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [page, limit, statusFilter, debouncedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();
    activeAbortRef.current?.abort();
    activeAbortRef.current = controller;
    void fetchRegisters({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchRegisters]);

  // Update register status when modal closes without resetting page/filters
  const handleModalClose = () => {
    setSelectedId(null);
    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    void fetchRegisters({ forceFresh: true, signal: controller.signal });
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(lastPage, nextPage));
    if (clamped === page) return;
    setPage(clamped);
    topAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const visiblePages = buildVisiblePages(page, lastPage);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div ref={topAnchorRef} className="min-w-0 space-y-6 animate-in fade-in duration-150 pb-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
          <History className="text-blue-500 shrink-0" size={30} />
          <span>Histórico e Auditoria de Caixas</span>
        </h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 md:p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold">Relatórios Anteriores</h2>
              {isRefreshing && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  <Loader2 size={12} className="animate-spin" />
                  Atualizando...
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              Acompanhe todos os turnos abertos e fechados na história da loja. Audite eventuais quebras de caixa do passado.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar #código ou operador..."
                aria-label="Buscar caixa por código ou operador"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-base md:text-sm text-white placeholder:text-zinc-500 outline-none transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    if (debouncedSearch) {
                      setPage(1);
                      setDebouncedSearch('');
                    }
                  }}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value as RegisterStatusFilter);
                }}
                aria-label="Filtrar por status do caixa"
                className="bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-base md:text-sm text-zinc-200 outline-none [color-scheme:dark] flex-1 sm:flex-none"
              >
                <option value="all">Todos os status</option>
                <option value="open">Abertos</option>
                <option value="pending_audit">Pendentes auditoria</option>
                <option value="closed">Fechados</option>
              </select>

              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                aria-label="Itens por página"
                className="bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-base md:text-sm text-zinc-200 outline-none [color-scheme:dark]"
              >
                <option value={15}>15 / pág.</option>
                <option value={30}>30 / pág.</option>
                <option value={50}>50 / pág.</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop View (Table) */}
        <div className={`hidden md:block overflow-x-auto transition-opacity duration-150 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Caixa</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Operador</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Abertura</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Fechamento</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Fundo (Início)</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Faturamento</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Terminou com</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {registers.map(reg => (
                <tr key={reg.id} className="hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    {reg.status === 'open' ? (
                       <span className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 w-fit tracking-wider"><CheckCircle2 size={14}/> ABERTO</span>
                    ) : reg.closingValue == null ? (
                       <span className="flex items-center gap-2 text-amber-500 font-bold text-[11px] bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 w-fit tracking-wider">PENDENTE DE AUDITORIA</span>
                    ) : (
                       <span className="flex items-center gap-2 text-zinc-500 font-bold text-[11px] bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700 w-fit tracking-wider"><XCircle size={14}/> FECHADO</span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap font-bold text-white">
                    #{reg.code ?? '--'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-zinc-300 font-medium">
                    {reg.operator?.name || 'Administrador'}
                  </td>
                  <td className="px-6 py-5 text-zinc-300 font-medium whitespace-nowrap">
                    {new Date(reg.openingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -')}
                  </td>
                  <td className="px-6 py-5 text-zinc-500 whitespace-nowrap">
                    {reg.closingTime ? new Date(reg.closingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -') : '--'}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-blue-400">
                    R$ {Number(reg.openingValue || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-emerald-400">
                    R$ {Number(reg.totalSales || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-zinc-400">
                    {reg.status === 'open' ? '--' : reg.closingValue != null ? `R$ ${Number(reg.closingValue).toFixed(2)}` : <span className="text-amber-500/80 text-xs uppercase">Pendente</span>}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => setSelectedId(reg.id)}
                      className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors inline-block"
                      title={reg.status === 'open' ? "Fechar Caixa" : "Ver Auditoria"}
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {registers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                    {debouncedSearch || statusFilter !== 'all'
                      ? 'Nenhum caixa encontrado para os filtros aplicados.'
                      : 'Nenhum caixa encontrado no banco de dados da loja.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className={`md:hidden divide-y divide-zinc-800/60 transition-opacity duration-150 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
          {registers.map(reg => (
            <div key={reg.id} className="p-5 space-y-4 hover:bg-zinc-800/20 transition-colors">
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-white text-sm">#{reg.code ?? '--'}</span>
                  <span className="text-xs text-zinc-500 font-mono truncate">ID: {reg.id.slice(0, 8)}</span>
                </div>
                {reg.status === 'open' ? (
                   <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 tracking-wider shrink-0"><CheckCircle2 size={12}/> ABERTO</span>
                ) : reg.closingValue == null ? (
                   <span className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 tracking-wider shrink-0">PENDENTE</span>
                ) : (
                   <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px] bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700 tracking-wider shrink-0"><XCircle size={12}/> FECHADO</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs block">Abertura</span>
                  <span className="text-zinc-300 font-medium">{new Date(reg.openingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -')}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Fechamento</span>
                  <span className="text-zinc-300 font-medium">{reg.closingTime ? new Date(reg.closingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -') : '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Fundo (Início)</span>
                  <span className="text-blue-400 font-bold">R$ {Number(reg.openingValue || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Terminou com</span>
                  <span className="text-zinc-400 font-bold">{reg.status === 'open' ? '--' : reg.closingValue != null ? `R$ ${Number(reg.closingValue).toFixed(2)}` : <span className="text-amber-500/80 uppercase text-[10px]">Pendente</span>}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Total Vendas</span>
                  <span className="text-emerald-400 font-bold">R$ {Number(reg.totalSales || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Operador</span>
                  <span className="text-zinc-300 font-medium truncate block">{reg.operator?.name || 'Administrador'}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setSelectedId(reg.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  <FileText size={14} />
                  {reg.status === 'open' ? "Fechar Caixa" : "Ver Detalhes"}
                </button>
              </div>
            </div>
          ))}
          {registers.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-sm">
              {debouncedSearch || statusFilter !== 'all'
                ? 'Nenhum caixa encontrado para os filtros aplicados.'
                : 'Nenhum caixa encontrado no banco de dados da loja.'}
            </div>
          )}
        </div>

        {/* Barra de Paginação */}
        {total > 0 && (
          <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-zinc-400">
            <span>
              Mostrando <strong className="text-zinc-200">{rangeStart}</strong>–<strong className="text-zinc-200">{rangeEnd}</strong> de{' '}
              <strong className="text-zinc-200">{total}</strong> caixas · Página <strong className="text-zinc-200">{page}</strong> de{' '}
              <strong className="text-zinc-200">{lastPage}</strong>
            </span>

            {lastPage > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || isRefreshing}
                  onClick={() => handlePageChange(page - 1)}
                  aria-label="Página anterior"
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline text-xs font-medium">Anterior</span>
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {visiblePages.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-2 text-zinc-500">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        disabled={isRefreshing}
                        onClick={() => handlePageChange(item)}
                        className={`min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          item === page
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  disabled={page >= lastPage || isRefreshing}
                  onClick={() => handlePageChange(page + 1)}
                  aria-label="Próxima página"
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <span className="hidden sm:inline text-xs font-medium">Próxima</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <CloseRegisterModal 
        isOpen={!!selectedId} 
        registerId={selectedId || ''} 
        onClose={handleModalClose}
        isAdminView={true}
      />
    </div>
  );
}
