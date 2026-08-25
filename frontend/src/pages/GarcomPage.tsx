import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import {
  UtensilsCrossed, Plus, Search, X, ChevronLeft, Loader2,
  Clock, ShoppingBag, User, LogOut, Package, Minus, KeyRound,
  CheckCircle2, ScanLine, AlertCircle, RefreshCw, FileText
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
  product: { id: string; name: string; unit?: string; barcode?: string };
}

interface Comanda {
  id: string;
  number: string;
  customerName?: string;
  notes?: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: ComandaItem[];
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
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function formatElapsed(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

function formatMoney(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function GarcomPage() {
  const { token } = useAuthStore();

  // Estado global da página
  const [waiter, setWaiter] = useState<WaiterOperator | null>(() => {
    try { return JSON.parse(localStorage.getItem('garcom_operator') || 'null'); } catch { return null; }
  });
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(false);

  // Telas / modais
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(!waiter);
  const [showNewComanda, setShowNewComanda] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showExtrato, setShowExtrato] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth: redirecionar se sem token JWT ──────────────────────────────────
  if (!token) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <UtensilsCrossed size={48} className="text-zinc-600 mx-auto" />
          <p className="text-zinc-400">Sessão expirada. Por favor, faça login novamente.</p>
          <a href="/login" className="block w-full py-3 rounded-2xl bg-orange-600 text-white font-bold text-center">
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
      setComandas(res.data || []);
      // Atualiza a comanda selecionada se estiver aberta
      if (selectedComanda) {
        const updated = res.data?.find((c: Comanda) => c.id === selectedComanda.id);
        if (updated) setSelectedComanda(updated);
      }
    } catch {
      // silencia erros de rede no polling
    } finally {
      setLoadingComandas(false);
    }
  }, [waiter, selectedComanda?.id]);

  useEffect(() => {
    if (!waiter) return;
    fetchComandas();
    const interval = setInterval(fetchComandas, 15000);
    return () => clearInterval(interval);
  }, [waiter]);

  // ── Buscar produtos com debounce ─────────────────────────────────────────
  useEffect(() => {
    if (!showAddItem) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!products.length) {
        setLoadingProducts(true);
        try {
          const res = await api.get('/products?limit=2000&active=true');
          setProducts(res.data?.data || res.data || []);
        } catch { /* silencia */ } finally {
          setLoadingProducts(false);
        }
      }
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
    }, 300);
  }, [productSearch, showAddItem, products]);

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
    setShowLoginModal(true);
    setSelectedComanda(null);
    setComandas([]);
  }

  // ── Criar comanda ─────────────────────────────────────────────────────────
  async function handleCreateComanda(e: React.FormEvent) {
    e.preventDefault();
    if (!newNumber.trim()) { toast.error('Informe o número ou nome da comanda.'); return; }
    setCreatingComanda(true);
    try {
      const res = await api.post('/v1/comandas', {
        number: newNumber.trim(),
        customerName: newCustomer.trim() || undefined,
        notes: newNotes.trim() || undefined,
        waiterId: waiter?.id,
      });
      setComandas(prev => [res.data, ...prev]);
      setShowNewComanda(false);
      setNewNumber(''); setNewCustomer(''); setNewNotes('');
      toast.success(`Comanda "${res.data.number}" criada!`);
      setSelectedComanda(res.data);
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
        items: [{ productId: selectedProduct.id, quantity: itemQty, notes: itemNotes || undefined }],
      });
      setSelectedComanda(res.data);
      setComandas(prev => prev.map(c => c.id === res.data.id ? res.data : c));
      setSelectedProduct(null); setItemQty(1); setItemNotes(''); setProductSearch('');
      toast.success(`${selectedProduct.name} lançado!`);
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
    } catch {
      toast.error('Erro ao remover item.');
    } finally {
      setRemovingItemId(null);
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

  // ── Comandas filtradas ────────────────────────────────────────────────────
  const displayComandas = searchMode && searchText
    ? comandas.filter(c =>
        normalizeText(c.number).includes(normalizeText(searchText)) ||
        (c.customerName && normalizeText(c.customerName).includes(normalizeText(searchText)))
      )
    : comandas;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col overflow-hidden select-none">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <UtensilsCrossed size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Modo Garçom</p>
            {waiter && <p className="text-sm font-bold text-white leading-tight">{waiter.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchComandas}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw size={16} className={loadingComandas ? 'animate-spin' : ''} />
          </button>
          {waiter && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut size={13} /> Sair
            </button>
          )}
        </div>
      </header>

      {/* ─── Conteúdo Principal ─────────────────────────────────────────── */}
      {waiter && !selectedComanda ? (
        /* ── Grid de Comandas ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de busca e contador */}
          <div className="px-4 py-3 flex items-center gap-3 bg-zinc-900/60 border-b border-zinc-800/60">
            {searchMode ? (
              <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                  autoFocus
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Buscar comanda ou cliente..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                />
                <button onClick={() => { setSearchMode(false); setSearchText(''); }} className="cursor-pointer">
                  <X size={14} className="text-zinc-400" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-bold text-white">{comandas.length}</span>
                  <span className="text-xs text-zinc-500 ml-1">comanda{comandas.length !== 1 ? 's' : ''} aberta{comandas.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => setSearchMode(true)} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer">
                  <Search size={16} />
                </button>
              </>
            )}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingComandas && !comandas.length ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="animate-spin text-orange-500" />
              </div>
            ) : displayComandas.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <ShoppingBag size={48} className="text-zinc-700 mx-auto" />
                <p className="text-zinc-500 font-medium">
                  {searchMode ? 'Nenhuma comanda encontrada.' : 'Nenhuma comanda aberta.'}
                </p>
                <p className="text-zinc-600 text-sm">Toque no botão abaixo para criar uma.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {displayComandas.map(comanda => (
                  <button
                    key={comanda.id}
                    onClick={() => setSelectedComanda(comanda)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-4 text-left transition-all active:scale-95 cursor-pointer flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-black text-lg text-white leading-tight truncate">{comanda.number}</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-0.5 shrink-0 mt-0.5">
                        <Clock size={10} />{formatElapsed(comanda.createdAt)}
                      </span>
                    </div>
                    {comanda.customerName && (
                      <span className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                        <User size={11} />{comanda.customerName}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-zinc-500">{comanda.items.length} item{comanda.items.length !== 1 ? 's' : ''}</span>
                      <span className="text-sm font-bold text-orange-400">{formatMoney(Number(comanda.total))}</span>
                    </div>
                    {comanda.waiter && (
                      <span className="text-[10px] text-zinc-600 truncate">👤 {comanda.waiter.name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : waiter && selectedComanda ? (
        /* ── Detalhe da Comanda ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-header */}
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => { setSelectedComanda(null); fetchComandas(); }} className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-base leading-tight truncate">{selectedComanda.number}</p>
              {selectedComanda.customerName && (
                <p className="text-xs text-zinc-400 truncate">{selectedComanda.customerName}</p>
              )}
            </div>
            <span className="text-orange-400 font-black text-lg">{formatMoney(Number(selectedComanda.total))}</span>
          </div>

          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto">
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
                      <p className="text-sm font-semibold text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-zinc-500">{item.quantity}x · {formatMoney(Number(item.unitPrice))}</p>
                      {item.notes && <p className="text-xs text-zinc-600 italic mt-0.5">"{item.notes}"</p>}
                    </div>
                    <span className="text-sm font-bold text-orange-400 shrink-0">{formatMoney(Number(item.totalPrice))}</span>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition disabled:opacity-50 cursor-pointer"
                    >
                      {removingItemId === item.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer de ações */}
          <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3 shrink-0">
            <button
              onClick={() => setShowExtrato(true)}
              className="flex-1 py-3 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={15} /> Extrato
            </button>
            <button
              onClick={() => { setShowAddItem(true); setSelectedProduct(null); setProductSearch(''); setItemQty(1); setItemNotes(''); }}
              className="flex-[2] py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20"
            >
              <Plus size={15} /> Adicionar Item
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Bottom Bar (Nova Comanda) ───────────────────────────────────── */}
      {waiter && !selectedComanda && (
        <div className="bg-zinc-900 border-t border-zinc-800 p-4 shrink-0">
          <button
            onClick={() => setShowNewComanda(true)}
            className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 text-sm"
          >
            <Plus size={16} /> Nova Comanda
          </button>
        </div>
      )}

      {/* ═══ Modal: Login de Garçom ═══════════════════════════════════════ */}
      {showLoginModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <UtensilsCrossed size={20} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Modo Garçom</h2>
                  <p className="text-xs text-zinc-400">Selecione seu perfil e insira o PIN</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-5">
              {/* Seleção de operador */}
              <div>
                <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                  Colaborador
                </label>
                {loadingOps ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
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

              {/* PIN */}
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
                    className={`w-full bg-zinc-950 border-2 rounded-2xl px-4 py-3.5 text-center text-3xl tracking-[0.5em] font-mono font-bold text-white outline-none transition-all ${
                      pinError ? 'border-red-500' : 'border-zinc-700 focus:border-orange-500'
                    }`}
                    maxLength={8}
                  />
                  {pinError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                      <AlertCircle size={12} /> {pinError}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedOp || pinInput.length < 4 || loginLoading}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Entrar
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Nova Comanda ══════════════════════════════════════════ */}
      {showNewComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white">Nova Comanda</h3>
              <button onClick={() => setShowNewComanda(false)} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"><X size={16} /></button>
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
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {creatingComanda ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creatingComanda ? 'Criando...' : 'Criar Comanda'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ Modal: Adicionar Item ═══════════════════════════════════════ */}
      {showAddItem && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => { setShowAddItem(false); setSelectedProduct(null); }} className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <p className="font-bold text-white flex-1">Adicionar Item — {selectedComanda.number}</p>
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
                <button onClick={() => setProductSearch('')} className="cursor-pointer">
                  <X size={14} className="text-zinc-400" />
                </button>
              )}
              <button onClick={() => setShowCamera(true)} className="text-zinc-400 hover:text-orange-400 transition cursor-pointer">
                <ScanLine size={16} />
              </button>
            </div>
          </div>

          {/* Lista de produtos */}
          <div className="flex-1 overflow-y-auto">
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
                    key={product.id}
                    onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition cursor-pointer ${
                      selectedProduct?.id === product.id ? 'bg-orange-500/10 border-l-2 border-l-orange-500' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                      <p className="text-xs text-zinc-500">{product.unit || 'UN'} · Estoque: {product.stock ?? '—'}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-400 shrink-0">{formatMoney(Number(product.priceSell))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Painel de confirmação (produto selecionado) */}
          {selectedProduct && (
            <div className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-4 shrink-0 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm truncate max-w-[180px]">{selectedProduct.name}</p>
                  <p className="text-xs text-zinc-400">{formatMoney(Number(selectedProduct.priceSell))} / {selectedProduct.unit || 'UN'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition cursor-pointer active:scale-90"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-xl font-black text-white w-6 text-center">{itemQty}</span>
                  <button
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
                placeholder="Observação (sem gelo, bem passado...)"
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-white text-xs outline-none transition placeholder:text-zinc-600"
              />

              <button
                onClick={handleAddItem}
                disabled={addingItem}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm shadow-lg shadow-orange-600/20"
              >
                {addingItem ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {addingItem ? 'Lançando...' : `Lançar ${itemQty}x · ${formatMoney(Number(selectedProduct.priceSell) * itemQty)}`}
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* ═══ Modal: Extrato Visual ══════════════════════════════════════ */}
      {showExtrato && selectedComanda && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-white">Extrato — {selectedComanda.number}</h3>
                {selectedComanda.customerName && <p className="text-xs text-zinc-400">{selectedComanda.customerName}</p>}
              </div>
              <button onClick={() => setShowExtrato(false)} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {selectedComanda.items.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-zinc-500">{item.quantity}x · {formatMoney(Number(item.unitPrice))}{item.notes && ` — "${item.notes}"`}</p>
                  </div>
                  <span className="text-sm font-bold text-orange-400 shrink-0 ml-4">{formatMoney(Number(item.totalPrice))}</span>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-zinc-800 shrink-0 bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold">Total da Comanda</span>
                <span className="text-2xl font-black text-orange-400">{formatMoney(Number(selectedComanda.total))}</span>
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">Pagamento realizado no caixa. Este é um extrato de conferência.</p>
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
