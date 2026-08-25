import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import {
  UtensilsCrossed, Plus, Search, X, ChevronLeft, Loader2,
  Clock, ShoppingBag, User, LogOut, Package, Minus, KeyRound,
  CheckCircle2, ScanLine, AlertCircle, RefreshCw, FileText,
  BellRing, Unlock
} from 'lucide-react';
import { CameraBarcodeScannerModal } from '@/components/CameraBarcodeScannerModal';
import { createPortal } from 'react-dom';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface WaiterOperator {
  id: string;
  name: string;
  jobTitle?: string;
  isManager?: boolean;
}

interface ComandaItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  createdById?: string;
  createdBy?: { id: string; name: string };
  product: { id: string; name: string; unit?: string; barcode?: string };
}

interface Comanda {
  id: string;
  number: string;
  customerName?: string;
  notes?: string;
  status: string; // 'open' | 'waiting_payment' | 'closed' | 'cancelled'
  total: number;
  createdAt: string;
  updatedAt: string;
  items: ComandaItem[];
  responsibleWaiter?: { id: string; name: string; jobTitle?: string };
  waiter?: { id: string; name: string; jobTitle?: string };
}

interface Product {
  id: string;
  name: string;
  priceSell: number;
  unit?: string;
  barcode?: string;
  shortCode?: string;
  stock?: number;
  imageUrl?: string | null;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function formatElapsed(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

function formatMoney(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function GarcomPage() {
  const { token } = useAuthStore();

  // Estado global do garçom
  const [waiter, setWaiter] = useState<WaiterOperator | null>(() => {
    try { return JSON.parse(localStorage.getItem('garcom_operator') || 'null'); } catch { return null; }
  });
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(false);

  // Telas / modais
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const selectedComandaIdRef = useRef<string | null>(null);

  const [showLoginModal, setShowLoginModal] = useState(!waiter);
  const [showNewComanda, setShowNewComanda] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showExtrato, setShowExtrato] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showRequestPaymentModal, setShowRequestPaymentModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Estado do modal de login
  const [operators, setOperators] = useState<WaiterOperator[]>([]);
  const [selectedOp, setSelectedOp] = useState<WaiterOperator | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loadingOps, setLoadingOps] = useState(false);

  // Estado da nova comanda
  const [newNumber, setNewNumber] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creatingComanda, setCreatingComanda] = useState(false);

  // Estado do adicionar item
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Ações de estado de comanda
  const [actionLoading, setActionLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navegação entre Mesas e Detalhe ──────────────────────────────────────
  const handleOpenComanda = (c: Comanda) => {
    selectedComandaIdRef.current = c.id;
    setSelectedComanda(c);
  };

  const handleBackToTables = () => {
    selectedComandaIdRef.current = null;
    setSelectedComanda(null);
  };

  // ── Auth: redirecionar se sem token JWT ──────────────────────────────────
  if (!token) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <UtensilsCrossed size={48} className="text-orange-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Sessão Expirada</h2>
          <p className="text-zinc-400 text-sm">Por favor, faça login novamente para acessar o Modo Garçom.</p>
          <a href="/login" className="block w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-center transition">
            Ir para Login
          </a>
        </div>
      </div>
    );
  }

  // ── Buscar operadores para login ─────────────────────────────────────────
  useEffect(() => {
    if (!showLoginModal) return;
    setLoadingOps(true);
    api.get('/operators')
      .then(res => setOperators(res.data.filter((o: any) => o.active)))
      .catch(() => toast.error('Erro ao carregar colaboradores.'))
      .finally(() => setLoadingOps(false));
  }, [showLoginModal]);

  // ── Buscar comandas (polling 15s) ────────────────────────────────────────
  const fetchComandas = useCallback(async () => {
    if (!waiter) return;
    setLoadingComandas(true);
    try {
      const res = await api.get('/v1/comandas?status=open');
      const list: Comanda[] = res.data || [];
      setComandas(list);
      // Atualiza a comanda selecionada APENAS se o ref ainda indicar que estamos nela
      if (selectedComandaIdRef.current) {
        const updated = list.find(c => c.id === selectedComandaIdRef.current);
        if (updated) {
          setSelectedComanda(updated);
        } else {
          // Se a comanda foi finalizada no caixa enquanto o garçom olhava
          selectedComandaIdRef.current = null;
          setSelectedComanda(null);
          toast.info('Esta comanda foi finalizada no caixa.');
        }
      }
    } catch {
      // silencia erros de rede no polling
    } finally {
      setLoadingComandas(false);
    }
  }, [waiter]);

  useEffect(() => {
    if (!waiter) return;
    fetchComandas();
    const interval = setInterval(fetchComandas, 15000);
    return () => clearInterval(interval);
  }, [waiter, fetchComandas]);

  // ── Buscar produtos atualizados do catálogo ──────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products?limit=2000&active=true');
      const list: Product[] = res.data?.data || res.data || [];
      setProducts(list);
      return list;
    } catch {
      return [];
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Recarregar catálogo de produtos sempre que o modal de adicionar for aberto
  useEffect(() => {
    if (showAddItem) {
      fetchProducts();
    }
  }, [showAddItem, fetchProducts]);

  // Filtragem rápida de produtos (com debounce de digitação)
  useEffect(() => {
    if (!showAddItem) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!productSearch.trim()) {
        setFilteredProducts(products.slice(0, 60));
        return;
      }
      const q = normalizeText(productSearch.trim());
      setFilteredProducts(
        products.filter(p =>
          normalizeText(p.name).includes(q) ||
          (p.barcode && p.barcode.includes(productSearch)) ||
          (p.shortCode && p.shortCode.toLowerCase().includes(productSearch.toLowerCase()))
        ).slice(0, 60)
      );
    }, 200);
  }, [productSearch, products, showAddItem]);

  // ── Login de operador ─────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOp || pinInput.length < 4) return;
    setLoginLoading(true);
    setPinError('');
    try {
      await api.post('/auth/operator-login', { operatorId: selectedOp.id, pin: pinInput });
      const op: WaiterOperator = { id: selectedOp.id, name: selectedOp.name, jobTitle: selectedOp.jobTitle };
      setWaiter(op);
      localStorage.setItem('garcom_operator', JSON.stringify(op));
      setShowLoginModal(false);
      setPinInput('');
      setSelectedOp(null);
    } catch {
      setPinError('PIN incorreto. Tente novamente.');
      setPinInput('');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setWaiter(null);
    localStorage.removeItem('garcom_operator');
    selectedComandaIdRef.current = null;
    setSelectedComanda(null);
    setShowLoginModal(true);
    setComandas([]);
  }

  // ── Criar comanda ─────────────────────────────────────────────────────────
  async function handleCreateComanda(e: React.FormEvent) {
    e.preventDefault();
    if (!newNumber.trim()) { toast.error('Informe o número ou nome da mesa/comanda.'); return; }
    setCreatingComanda(true);
    try {
      const res = await api.post('/v1/comandas', {
        number: newNumber.trim(),
        customerName: newCustomer.trim() || undefined,
        notes: newNotes.trim() || undefined,
        responsibleWaiterId: waiter?.id,
      });
      setComandas(prev => [res.data, ...prev]);
      setShowNewComanda(false);
      setNewNumber(''); setNewCustomer(''); setNewNotes('');
      toast.success(`Mesa "${res.data.number}" aberta com sucesso!`);
      handleOpenComanda(res.data);
      setShowAddItem(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar comanda.');
    } finally {
      setCreatingComanda(false);
    }
  }

  // ── Adicionar item ────────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!selectedComanda || !selectedProduct) return;
    setAddingItem(true);
    try {
      const res = await api.post(`/v1/comandas/${selectedComanda.id}/items`, {
        items: [{
          productId: selectedProduct.id,
          quantity: itemQty,
          notes: itemNotes || undefined,
          createdById: waiter?.id,
        }],
      });
      setSelectedComanda(res.data);
      setComandas(prev => prev.map(c => c.id === res.data.id ? res.data : c));
      setSelectedProduct(null); setItemQty(1); setItemNotes(''); setProductSearch('');
      toast.dismiss();
      toast.success(`${selectedProduct.name} lançado!`, { duration: 1200 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao lançar item.');
    } finally {
      setAddingItem(false);
    }
  }

  // ── Remover item ──────────────────────────────────────────────────────────
  async function handleRemoveItem(itemId: string) {
    if (!selectedComanda) return;
    setRemovingItemId(itemId);
    try {
      const res = await api.delete(`/v1/comandas/${selectedComanda.id}/items/${itemId}`);
      setSelectedComanda(res.data);
      setComandas(prev => prev.map(c => c.id === res.data.id ? res.data : c));
      toast.dismiss();
      toast.success('Item removido.', { duration: 1200 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover item.');
    } finally {
      setRemovingItemId(null);
    }
  }

  // ── Solicitar Fechamento (waiting_payment) ─────────────────────────────────
  async function handleRequestPayment() {
    if (!selectedComanda) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/v1/comandas/${selectedComanda.id}/request-payment`);
      setSelectedComanda(res.data);
      setComandas(prev => prev.map(c => c.id === res.data.id ? res.data : c));
      setShowRequestPaymentModal(false);
      toast.dismiss();
      toast.success(`Fechamento da Mesa #${selectedComanda.number} enviado ao caixa!`, { duration: 1500 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao solicitar fechamento.');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Reabrir Comanda (open) ────────────────────────────────────────────────
  async function handleReopenComanda() {
    if (!selectedComanda) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/v1/comandas/${selectedComanda.id}/reopen`);
      setSelectedComanda(res.data);
      setComandas(prev => prev.map(c => c.id === res.data.id ? res.data : c));
      setShowReopenModal(false);
      toast.dismiss();
      toast.success(`Mesa #${selectedComanda.number} reaberta para novos lançamentos.`, { duration: 1500 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao reabrir comanda.');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Scan de barcode ───────────────────────────────────────────────────────
  function handleBarcodeScan(code: string) {
    setShowCamera(false);
    setProductSearch(code);
    const found = products.find(p => p.barcode === code || p.shortCode === code);
    if (found) setSelectedProduct(found);
    else toast.info(`Buscando: ${code}`);
  }

  // ── Comandas filtradas e ordenadas (waiting_payment no topo) ───────────────
  const displayComandas = comandas.filter(c => {
    if (!searchMode || !searchText.trim()) return true;
    const q = normalizeText(searchText.trim());
    return normalizeText(c.number).includes(q) ||
      (c.customerName && normalizeText(c.customerName).includes(q));
  }).sort((a, b) => {
    const aWaiting = a.status === 'waiting_payment';
    const bWaiting = b.status === 'waiting_payment';
    if (aWaiting && !bWaiting) return -1;
    if (!aWaiting && bWaiting) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const waitingCount = comandas.filter(c => c.status === 'waiting_payment').length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER (Layout Centralizado e Responsivo para Desktop e Mobile)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col items-center justify-start overflow-hidden select-none">
      
      {/* Container Centralizado para Desktop e 100% no Mobile */}
      <div className="w-full max-w-xl flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 border-x border-zinc-800/50 shadow-2xl relative">

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <UtensilsCrossed size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Modo Garçom</p>
              {waiter && <p className="text-sm font-bold text-white leading-tight">{waiter.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchComandas}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Atualizar mesas"
            >
              <RefreshCw size={16} className={loadingComandas ? 'animate-spin' : ''} />
            </button>
            {waiter && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut size={13} /> Sair
              </button>
            )}
          </div>
        </header>

        {/* ─── Conteúdo Principal: Grid de Mesas ────────────────────────────── */}
        {waiter && !selectedComanda ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barra de busca e status */}
            <div className="px-4 py-3 flex items-center gap-3 bg-zinc-900/60 border-b border-zinc-800/60 shrink-0">
              {searchMode ? (
                <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                  <Search size={14} className="text-zinc-400 shrink-0" />
                  <input
                    autoFocus
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Buscar mesa ou cliente..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                  />
                  <button type="button" onClick={() => { setSearchMode(false); setSearchText(''); }} className="cursor-pointer">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{comandas.length}</span>
                    <span className="text-xs text-zinc-500">mesa{comandas.length !== 1 ? 's' : ''} ativa{comandas.length !== 1 ? 's' : ''}</span>
                    {waitingCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                        {waitingCount} no caixa
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => setSearchMode(true)} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer">
                    <Search size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Grid de Mesas */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loadingComandas && !comandas.length ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 size={32} className="animate-spin text-orange-500" />
                </div>
              ) : displayComandas.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <ShoppingBag size={48} className="text-zinc-700 mx-auto" />
                  <p className="text-zinc-500 font-medium">
                    {searchMode ? 'Nenhuma mesa encontrada.' : 'Nenhuma mesa aberta no momento.'}
                  </p>
                  <p className="text-zinc-600 text-sm">Toque no botão abaixo para abrir uma nova mesa.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {displayComandas.map(comanda => {
                    const isWaiting = comanda.status === 'waiting_payment';
                    const waiterName = comanda.responsibleWaiter?.name || comanda.waiter?.name;
                    return (
                      <button
                        type="button"
                        key={comanda.id}
                        onClick={() => handleOpenComanda(comanda)}
                        className={`rounded-2xl p-4 text-left transition-all active:scale-95 cursor-pointer flex flex-col gap-2 relative overflow-hidden ${
                          isWaiting
                            ? 'bg-orange-950/30 border-2 border-orange-500/70 ring-1 ring-orange-500/40 shadow-lg shadow-orange-500/10'
                            : 'bg-zinc-900 border border-zinc-800 hover:border-amber-500/40'
                        }`}
                      >
                        {isWaiting && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" /> Caixa
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-1 pr-12">
                          <span className="font-black text-lg text-white leading-tight truncate">#{comanda.number}</span>
                        </div>

                        {comanda.customerName && (
                          <span className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                            <User size={11} className="shrink-0" /> {comanda.customerName}
                          </span>
                        )}

                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-800/40">
                          <span className="text-[11px] text-zinc-500">{comanda.items?.length || 0} item{comanda.items?.length !== 1 ? 's' : ''}</span>
                          <span className={`text-sm font-black font-mono ${isWaiting ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {formatMoney(Number(comanda.total))}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} /> {formatElapsed(comanda.createdAt)}
                          </span>
                          {waiterName && <span className="truncate max-w-[80px]">👤 {waiterName}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Bar: Abrir Nova Mesa */}
            <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowNewComanda(true)}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 text-sm"
              >
                <Plus size={16} /> Abrir Nova Mesa / Comanda
              </button>
            </div>
          </div>
        ) : waiter && selectedComanda ? (
          /* ── Detalhe da Comanda / Mesa ─────────────────────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-header com Botão Voltar 'Mesas' em destaque */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleBackToTables}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-xl font-bold text-xs transition cursor-pointer border border-zinc-700 shadow-sm shrink-0"
                title="Voltar para a lista de mesas"
              >
                <ChevronLeft size={18} className="text-orange-400" />
                <span>Mesas</span>
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-white text-base leading-tight truncate">#{selectedComanda.number}</p>
                  {selectedComanda.status === 'waiting_payment' && (
                    <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                      Aguardando Caixa
                    </span>
                  )}
                </div>
                {selectedComanda.customerName && (
                  <p className="text-xs text-zinc-400 truncate">{selectedComanda.customerName}</p>
                )}
              </div>
              <span className={`font-black text-lg font-mono shrink-0 ${selectedComanda.status === 'waiting_payment' ? 'text-orange-400' : 'text-emerald-400'}`}>
                {formatMoney(Number(selectedComanda.total))}
              </span>
            </div>

            {/* Banner de status: se aguardando pagamento */}
            {selectedComanda.status === 'waiting_payment' && (
              <div className="bg-orange-950/40 border-b border-orange-500/30 px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                  Conta enviada para fechamento no caixa
                </div>
                <span className="text-[11px] text-orange-400/80">Lançamentos pausados</span>
              </div>
            )}

            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {selectedComanda.items.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Package size={40} className="text-zinc-700 mx-auto" />
                  <p className="text-zinc-500 text-sm">Comanda vazia. Adicione itens abaixo.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {selectedComanda.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.product?.name || 'Produto'}</p>
                        <p className="text-xs text-zinc-500">
                          {Number(item.quantity)}x · {formatMoney(Number(item.unitPrice))}
                          {item.createdBy?.name && <span className="text-[10px] text-zinc-600 ml-1.5">(por {item.createdBy.name})</span>}
                        </p>
                        {item.notes && <p className="text-xs text-zinc-400 italic mt-0.5">"{item.notes}"</p>}
                      </div>
                      <span className="text-sm font-bold text-white font-mono shrink-0">{formatMoney(Number(item.totalPrice))}</span>
                      {selectedComanda.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removingItemId === item.id}
                          className="p-1.5 rounded-xl hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition disabled:opacity-50 cursor-pointer"
                          title="Remover item"
                        >
                          {removingItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer de Ações */}
            <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
              {selectedComanda.status === 'waiting_payment' ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExtrato(true)}
                    className="flex-1 py-3 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText size={15} /> Extrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReopenModal(true)}
                    className="flex-[2] py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
                  >
                    <Unlock size={15} /> Reabrir Comanda
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExtrato(true)}
                    className="px-3.5 py-3 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Ver extrato de conferência"
                  >
                    <FileText size={15} /> Extrato
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddItem(true); setSelectedProduct(null); setProductSearch(''); setItemQty(1); setItemNotes(''); }}
                    className="flex-1 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/20"
                  >
                    <Plus size={15} /> Adicionar Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRequestPaymentModal(true)}
                    disabled={!selectedComanda.items?.length}
                    className="px-3.5 py-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 text-sm font-bold transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Solicitar fechamento no caixa"
                  >
                    <BellRing size={15} /> Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ═══ Modal: Login de Garçom (Centralizado) ═════════════════════════ */}
      {showLoginModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                <UtensilsCrossed size={24} className="text-orange-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Modo Garçom</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Selecione seu perfil e digite o PIN</p>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                  Colaborador
                </label>
                {loadingOps ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5 custom-scrollbar">
                    {operators.map(op => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => { setSelectedOp(op); setPinInput(''); setPinError(''); }}
                        className={`px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                          selectedOp?.id === op.id
                            ? 'bg-orange-500/20 border-orange-500/50 text-white'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{op.name}</p>
                        {op.jobTitle && <p className="text-[10px] text-zinc-500 truncate">{op.jobTitle}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedOp && (
                <div>
                  <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <KeyRound size={12} /> PIN de {selectedOp.name}
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinError(''); }}
                    placeholder="••••"
                    className={`w-full bg-zinc-950 border-2 rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono font-bold text-white outline-none transition-all ${
                      pinError ? 'border-red-500' : 'border-zinc-700 focus:border-orange-500'
                    }`}
                    maxLength={8}
                  />
                  {pinError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 justify-center">
                      <AlertCircle size={12} /> {pinError}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedOp || pinInput.length < 4 || loginLoading}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 text-sm"
              >
                {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Entrar
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Nova Comanda (Centralizado) ════════════════════════════ */}
      {showNewComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Abrir Nova Mesa / Comanda</h3>
              <button type="button" onClick={() => setShowNewComanda(false)} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateComanda} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Número / Nome da Mesa <span className="text-orange-400">*</span>
                </label>
                <input
                  autoFocus
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  placeholder="Ex: Mesa 01, Balcão, VIP 03..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Nome do Cliente (opcional)
                </label>
                <input
                  value={newCustomer}
                  onChange={e => setNewCustomer(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Observações (opcional)
                </label>
                <input
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Ex: Mesa da janela, aniversário..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={!newNumber.trim() || creatingComanda}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 text-sm"
              >
                {creatingComanda ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creatingComanda ? 'Abrindo...' : 'Abrir Mesa'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Adicionar Item (Centralizado e Responsivo) ══════════════ */}
      {showAddItem && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-xl h-full sm:h-[85vh] sm:rounded-3xl flex flex-col bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
              <button type="button" onClick={() => { setShowAddItem(false); setSelectedProduct(null); }} className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white cursor-pointer">
                <ChevronLeft size={20} />
              </button>
              <p className="font-bold text-white text-sm flex-1 truncate">Adicionar Item — #{selectedComanda.number}</p>
              <button
                type="button"
                onClick={fetchProducts}
                className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                title="Recarregar produtos do catálogo"
              >
                <RefreshCw size={15} className={loadingProducts ? 'animate-spin text-orange-400' : ''} />
              </button>
            </div>

            {/* Busca */}
            <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/60 shrink-0">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                  autoFocus
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Nome, código de barras ou código curto..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                />
                {productSearch && (
                  <button type="button" onClick={() => setProductSearch('')} className="cursor-pointer">
                    <X size={14} className="text-zinc-400" />
                  </button>
                )}
                <button type="button" onClick={() => setShowCamera(true)} className="text-zinc-400 hover:text-orange-400 transition cursor-pointer" title="Escanear com câmera">
                  <ScanLine size={16} />
                </button>
              </div>
            </div>

            {/* Lista de produtos */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingProducts ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
              ) : filteredProducts.length === 0 && productSearch ? (
                <div className="text-center py-16">
                  <p className="text-zinc-500 text-sm">Nenhum produto encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {filteredProducts.map(product => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition cursor-pointer ${
                        selectedProduct?.id === product.id ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : 'hover:bg-zinc-900'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package size={18} className="text-zinc-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                        <p className="text-xs text-zinc-500">{product.unit || 'UN'} · Estoque: {product.stock ?? '—'}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 font-mono shrink-0">{formatMoney(Number(product.priceSell))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Painel de confirmação (produto selecionado) */}
            {selectedProduct && (
              <div className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-3 shrink-0 animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {selectedProduct.imageUrl ? (
                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate max-w-[160px] sm:max-w-[200px]">{selectedProduct.name}</p>
                      <p className="text-xs text-zinc-400">{formatMoney(Number(selectedProduct.priceSell))} / {selectedProduct.unit || 'UN'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setItemQty(q => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition cursor-pointer active:scale-90"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-xl font-black text-white w-6 text-center">{itemQty}</span>
                    <button
                      type="button"
                      onClick={() => setItemQty(q => q + 1)}
                      className="w-9 h-9 rounded-xl bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white transition cursor-pointer active:scale-90"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <input
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  placeholder="Observação (ex: sem gelo, bem passado, 2 copos...)"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none transition placeholder:text-zinc-600"
                />

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={addingItem}
                  className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm shadow-lg shadow-orange-600/20"
                >
                  {addingItem ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {addingItem ? 'Lançando...' : `Lançar ${itemQty}x · ${formatMoney(Number(selectedProduct.priceSell) * itemQty)}`}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Solicitar Fechamento (Centralizado) ════════════════════ */}
      {showRequestPaymentModal && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <BellRing size={24} className="text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white">Solicitar Fechamento?</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              O caixa será notificado para receber a <strong className="text-white">Mesa #{selectedComanda.number}</strong> ({formatMoney(Number(selectedComanda.total))}). Novos lançamentos ficarão pausados.
            </p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowRequestPaymentModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRequestPayment}
                disabled={actionLoading}
                className="flex-[1.5] py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/20"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Reabrir Comanda (Centralizado) ═════════════════════════ */}
      {showReopenModal && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
              <Unlock size={24} className="text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white">Reabrir Mesa?</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Deseja reabrir a <strong className="text-white">Mesa #{selectedComanda.number}</strong> para realizar novos lançamentos de produtos?
            </p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReopenComanda}
                disabled={actionLoading}
                className="flex-[1.5] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                Reabrir Mesa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Extrato Visual (Centralizado) ══════════════════════════ */}
      {showExtrato && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-orange-400" /> Extrato — #{selectedComanda.number}
                </h3>
                {selectedComanda.customerName && <p className="text-xs text-zinc-400 mt-0.5">Cliente: {selectedComanda.customerName}</p>}
              </div>
              <button type="button" onClick={() => setShowExtrato(false)} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
              {selectedComanda.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{item.product?.name || 'Produto'}</p>
                    <p className="text-xs text-zinc-500">
                      {Number(item.quantity)}x · {formatMoney(Number(item.unitPrice))}
                      {item.notes && <span className="italic text-zinc-400"> — "{item.notes}"</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-white font-mono shrink-0 ml-4">{formatMoney(Number(item.totalPrice))}</span>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-zinc-800 shrink-0 bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold text-xs">Total do Consumo</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{formatMoney(Number(selectedComanda.total))}</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 text-center">Pagamento realizado no caixa. Extrato de simples conferência.</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Scanner de Câmera ══════════════════════════════════════════ */}
      {showCamera && (
        <CameraBarcodeScannerModal
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onDetected={handleBarcodeScan}
        />
      )}
    </div>
  );
}

