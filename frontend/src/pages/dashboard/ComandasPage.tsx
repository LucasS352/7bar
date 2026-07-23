import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cart';
import { 
  User, Search, Plus, Trash2, CheckCircle2, AlertCircle, 
  ChevronRight, Calendar, DollarSign, X, Loader2, ArrowLeft, RefreshCw,
  UtensilsCrossed, Printer, ShoppingBag, Receipt, Clock
} from 'lucide-react';

interface OperatorConsumption {
  id: string;
  name: string;
  jobTitle?: string | null;
  pendingBalance: number;
}

interface ConsumptionItem {
  id: string;
  name: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  settled?: boolean;
  settledAt?: string | null;
}

interface ConsumptionRecord {
  id: string;
  saleId: string;
  total: number;
  settled: boolean;
  settledAt: string | null;
  createdAt: string;
  items: ConsumptionItem[];
}

interface Product {
  id: string;
  name: string;
  priceSell: number;
  stock: number;
  barcode?: string | null;
  shortCode?: string | null;
  active: boolean;
}

interface ComandaItem {
  id: string;
  comandaId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  createdAt: string;
  product?: Product;
}

interface Comanda {
  id: string;
  number: string;
  customerName?: string | null;
  status: 'open' | 'closed' | 'cancelled';
  total: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: ComandaItem[];
}

export function ComandasPage() {
  const navigate = useNavigate();
  const { clearCart, addItem } = useCartStore();

  const [activeTab, setActiveTab] = useState<'cliente' | 'funcionario'>('cliente');
  const [products, setProducts] = useState<Product[]>([]);
  
  // ── ESTADOS DE COMANDAS DE CLIENTES ───────────────────────────────────────
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(true);
  const [comandaSearch, setComandaSearch] = useState('');
  
  // Modal de Nova Comanda
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creatingComanda, setCreatingComanda] = useState(false);

  // Modal de Detalhes / Lançamento de Itens
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [addingProductId, setAddingProductId] = useState('');
  const [addingQuantity, setAddingQuantity] = useState(1);
  const [addingItem, setAddingItem] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // ── ESTADOS DE CONSUMO DE FUNCIONÁRIOS ────────────────────────────────────
  const [operators, setOperators] = useState<OperatorConsumption[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [operatorSearch, setOperatorSearch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<OperatorConsumption | null>(null);
  const [history, setHistory] = useState<ConsumptionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedItemsToSettle, setSelectedItemsToSettle] = useState<string[]>([]);
  const [settling, setSettling] = useState(false);

  // Fetch Comandas
  const fetchComandas = async () => {
    setLoadingComandas(true);
    try {
      const res = await api.get('/v1/comandas?status=open');
      setComandas(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar comandas.');
    } finally {
      setLoadingComandas(false);
    }
  };

  // Fetch Operators
  const fetchOperators = async () => {
    setLoadingOperators(true);
    try {
      const res = await api.get('/operators/consumptions');
      setOperators(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOperators(false);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=1000');
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComandas();
    fetchOperators();
    fetchProducts();
  }, []);

  // Recarregar detalhes da comanda selecionada
  const refreshSelectedComanda = async (id: string) => {
    try {
      const res = await api.get(`/v1/comandas/${id}`);
      setSelectedComanda(res.data);
      // Atualizar na lista geral também
      fetchComandas();
    } catch (err) {
      console.error(err);
    }
  };

  // Criar Comanda
  const handleCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) {
      toast.error('Informe o número ou identificador da comanda.');
      return;
    }
    setCreatingComanda(true);
    try {
      const res = await api.post('/v1/comandas', {
        number: newNumber.trim(),
        customerName: newCustomer.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });
      toast.success(`Comanda #${res.data.number} aberta com sucesso!`);
      setNewNumber('');
      setNewCustomer('');
      setNewNotes('');
      setIsNewComandaModalOpen(false);
      fetchComandas();
      setSelectedComanda(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao criar comanda.';
      toast.error(msg);
    } finally {
      setCreatingComanda(false);
    }
  };

  // Adicionar Item a Comanda
  const handleAddItemToComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda) return;
    if (!addingProductId) {
      toast.error('Selecione um produto.');
      return;
    }
    setAddingItem(true);
    try {
      await api.post(`/v1/comandas/${selectedComanda.id}/items`, {
        items: [{ productId: addingProductId, quantity: Number(addingQuantity) }]
      });
      toast.success('Item adicionado à comanda!');
      setAddingProductId('');
      setAddingQuantity(1);
      setProductSearch('');
      refreshSelectedComanda(selectedComanda.id);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao adicionar item.';
      toast.error(msg);
    } finally {
      setAddingItem(false);
    }
  };

  // Remover Item da Comanda
  const handleRemoveComandaItem = async (itemId: string) => {
    if (!selectedComanda) return;
    try {
      await api.delete(`/v1/comandas/${selectedComanda.id}/items/${itemId}`);
      toast.success('Item removido da comanda.');
      refreshSelectedComanda(selectedComanda.id);
    } catch (err: any) {
      toast.error('Erro ao remover item.');
    }
  };

  // Cobrar / Fechar Comanda -> Carrega no Carrinho do PDV
  const handleChargeComanda = (comanda: Comanda) => {
    if (!comanda.items || comanda.items.length === 0) {
      toast.error('A comanda não possui itens para cobrar.');
      return;
    }

    clearCart();

    comanda.items.forEach(item => {
      if (item.product) {
        addItem(
          {
            id: item.product.id,
            name: item.product.name,
            priceSell: Number(item.unitPrice),
            stock: item.product.stock || 0,
            barcode: item.product.barcode || null,
            shortCode: item.product.shortCode || null,
          },
          Number(item.quantity)
        );
      }
    });

    toast.info(`Itens da Comanda #${comanda.number} carregados no caixa!`, { duration: 3000 });
    navigate('/dashboard');
  };

  // Extrato de Impressão da Comanda
  const handlePrintExtrato = (comanda: Comanda) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;

    const itemsHtml = (comanda.items || []).map(i => `
      <tr>
        <td style="padding: 4px 0;">${i.quantity}x ${i.product?.name || 'Item'}</td>
        <td style="text-align: right; padding: 4px 0;">R$ ${Number(i.totalPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Extrato Comanda #${comanda.number}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 15px; width: 280px; margin: 0 auto; }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; }
            p { margin: 2px 0; font-size: 11px; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h2>EXTRATO DE CONSUMO</h2>
          <p style="text-align:center;">Comanda / Mesa: <strong>#${comanda.number}</strong></p>
          ${comanda.customerName ? `<p style="text-align:center;">Cliente: ${comanda.customerName}</p>` : ''}
          <p style="text-align:center;">Data: ${new Date(comanda.createdAt).toLocaleString('pt-BR')}</p>
          <hr />
          <table>
            <tbody>${itemsHtml}</tbody>
          </table>
          <hr />
          <div class="total">TOTAL: R$ ${Number(comanda.total).toFixed(2)}</div>
          <p style="text-align:center; margin-top: 20px; font-size: 10px;">Não é documento fiscal</p>
          <script>window.print(); setTimeout(() => window.close(), 1000);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // ── CONSUMO FUNCIONÁRIOS HELPERS ──────────────────────────────────────────
  const fetchOperatorHistory = async (operatorId: string) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/operators/consumptions/${operatorId}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar extrato de consumo.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOperator) {
      fetchOperatorHistory(selectedOperator.id);
    }
  }, [selectedOperator]);

  const totalComandasAccrued = useMemo(() => {
    return comandas.reduce((acc, c) => acc + Number(c.total || 0), 0);
  }, [comandas]);

  const filteredComandas = useMemo(() => {
    return comandas.filter(c => 
      c.number.toLowerCase().includes(comandaSearch.toLowerCase()) ||
      (c.customerName && c.customerName.toLowerCase().includes(comandaSearch.toLowerCase()))
    );
  }, [comandas, comandaSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 15);
  }, [products, productSearch]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UtensilsCrossed size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Comandas & Mesas</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Gerencie o consumo em aberto de clientes e colaboradores</p>
            </div>
          </div>
        </div>

        {/* Tabs Selection */}
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800/80 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('cliente')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'cliente' ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/10' : 'text-zinc-400 hover:text-white'}`}
          >
            <UtensilsCrossed size={16} /> Comandas / Mesas ({comandas.length})
          </button>
          <button
            onClick={() => setActiveTab('funcionario')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'funcionario' ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/10' : 'text-zinc-400 hover:text-white'}`}
          >
            <User size={16} /> Funcionários ({operators.length})
          </button>
        </div>
      </div>

      {/* TAB 1: COMANDAS DE CLIENTES & MESAS */}
      {activeTab === 'cliente' && (
        <div className="space-y-6">
          
          {/* KPI Bar & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Comandas Abertas</p>
                <p className="text-2xl font-black text-white mt-1">{comandas.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <UtensilsCrossed size={20} />
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Consumo Total Acumulado</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">R$ {totalComandasAccrued.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNewComandaModalOpen(true)}
                className="w-full h-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black p-4 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95 text-sm"
              >
                <Plus size={20} /> Abrir Nova Comanda / Mesa
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por número da mesa ou nome do cliente..."
              value={comandaSearch}
              onChange={e => setComandaSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Grid de Cards de Comandas */}
          {loadingComandas ? (
            <div className="py-16 text-center text-zinc-500">
              <Loader2 className="animate-spin mx-auto mb-2 text-amber-500" size={28} />
              <p className="text-xs font-bold">Carregando comandas abertas...</p>
            </div>
          ) : filteredComandas.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-12 text-center">
              <UtensilsCrossed className="mx-auto text-zinc-600 mb-3" size={40} />
              <h3 className="text-white font-bold text-base">Nenhuma comanda aberta encontrada</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {comandaSearch ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Nenhuma mesa ou comanda está em consumo no momento. Clique no botão acima para abrir uma nova.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComandas.map(c => (
                <div key={c.id} className="bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition shadow-xl group">
                  <div>
                    {/* Header Card */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg inline-block">
                          MESA / COMANDA #{c.number}
                        </span>
                        {c.customerName && (
                          <h3 className="text-white font-bold text-base mt-2 truncate">{c.customerName}</h3>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Acumulado</span>
                        <span className="text-lg font-black text-emerald-400">R$ {Number(c.total || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>{c.items?.length || 0} item(ns)</span>
                    </div>

                    {/* Resumo de itens (primeiros 3) */}
                    <div className="bg-zinc-950/60 rounded-xl p-3 space-y-1 text-xs border border-zinc-800/50">
                      {c.items && c.items.length > 0 ? (
                        c.items.slice(0, 3).map(item => (
                          <div key={item.id} className="flex justify-between items-center text-zinc-300">
                            <span className="truncate max-w-[170px]">{Number(item.quantity)}x {item.product?.name || 'Item'}</span>
                            <span className="font-mono text-zinc-400">R$ {Number(item.totalPrice).toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-600 text-[11px] italic">Sem itens lançados ainda</p>
                      )}
                      {c.items && c.items.length > 3 && (
                        <p className="text-[10px] text-amber-400/80 font-bold pt-1 text-center">
                          + {c.items.length - 3} outros item(ns)...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => setSelectedComanda(c)}
                      className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Ver e adicionar itens"
                    >
                      <Plus size={14} /> Lançar
                    </button>
                    <button
                      onClick={() => handlePrintExtrato(c)}
                      className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Imprimir extrato de consumo"
                    >
                      <Printer size={14} /> Extrato
                    </button>
                    <button
                      onClick={() => handleChargeComanda(c)}
                      className="px-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Carregar itens no caixa do PDV para cobrar"
                    >
                      <ShoppingBag size={14} /> Cobrar
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: CONSUMO DE FUNCIONÁRIOS (EXISTENTE) */}
      {activeTab === 'funcionario' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <Search className="text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar colaborador por nome..."
              value={operatorSearch}
              onChange={e => setOperatorSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {loadingOperators ? (
            <div className="py-12 text-center text-zinc-500">Carregando colaboradores...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operators
                .filter(op => op.name.toLowerCase().includes(operatorSearch.toLowerCase()))
                .map(op => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperator(op)}
                    className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 cursor-pointer transition flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                        {op.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm group-hover:text-amber-400 transition">{op.name}</h4>
                        <p className="text-xs text-zinc-500">{op.jobTitle || 'Colaborador'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Pendente</span>
                      <span className="text-sm font-black text-amber-400">R$ {Number(op.pendingBalance || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE NOVA COMANDA */}
      {isNewComandaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <UtensilsCrossed className="text-amber-400" size={20} /> Abrir Nova Comanda / Mesa
              </h3>
              <button 
                onClick={() => setIsNewComandaModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateComanda} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Número / Identificação da Mesa *</label>
                <input
                  type="text"
                  placeholder="Ex: 01, Mesa 05, Sinuca 1..."
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Nome do Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: João da Sinuca, Grupo do Bar..."
                  value={newCustomer}
                  onChange={e => setNewCustomer(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Fica na mesa de sinuca dos fundos..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewComandaModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl font-bold transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingComanda}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {creatingComanda ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Abrir Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES E LANÇAMENTO DE ITENS DA COMANDA */}
      {selectedComanda && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative text-left my-8">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-zinc-800 pb-4 mb-4">
              <div>
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold px-2.5 py-1 rounded-lg inline-block">
                  MESA / COMANDA #{selectedComanda.number}
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {selectedComanda.customerName || 'Cliente Consumidor'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Aberta em: {new Date(selectedComanda.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Atual</span>
                  <span className="text-xl font-black text-emerald-400">R$ {Number(selectedComanda.total || 0).toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setSelectedComanda(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2 rounded-xl transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Form de Adicionar Item Direto na Comanda */}
            <form onSubmit={handleAddItemToComanda} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 mb-5 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Lançar Novo Produto na Comanda:</span>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 relative">
                  <input
                    type="text"
                    placeholder="Pesquisar produto pelo nome..."
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value);
                      setAddingProductId('');
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                  {productSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl max-h-40 overflow-y-auto z-20 shadow-xl">
                      {filteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setAddingProductId(p.id);
                            setProductSearch(p.name);
                          }}
                          className="p-2.5 hover:bg-zinc-800 cursor-pointer text-xs text-white flex justify-between border-b border-zinc-800/50 last:border-0"
                        >
                          <span>{p.name}</span>
                          <span className="text-emerald-400 font-bold">R$ {Number(p.priceSell).toFixed(2)}</span>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="p-3 text-xs text-zinc-500 text-center">Nenhum produto encontrado</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={addingQuantity}
                    onChange={e => setAddingQuantity(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-amber-500"
                    placeholder="Qtd"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={addingItem || !addingProductId}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold py-2 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {addingItem ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    Adicionar
                  </button>
                </div>
              </div>
            </form>

            {/* Extrato / Lista de Itens Lançados */}
            <div className="space-y-2 mb-6">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Itens Lançados nesta Comanda:</span>
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {selectedComanda.items && selectedComanda.items.length > 0 ? (
                  selectedComanda.items.map(item => (
                    <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">{item.product?.name || 'Produto'}</p>
                        <p className="text-zinc-500 font-mono text-[11px] mt-0.5">
                          {Number(item.quantity)} x R$ {Number(item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-emerald-400 text-sm">R$ {Number(item.totalPrice).toFixed(2)}</span>
                        <button
                          onClick={() => handleRemoveComandaItem(item.id)}
                          className="text-zinc-600 hover:text-red-400 p-1 transition"
                          title="Remover item da comanda"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-zinc-500 text-xs italic bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                    Nenhum item foi lançado nesta comanda ainda.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-800 pt-4">
              <button
                onClick={() => handlePrintExtrato(selectedComanda)}
                className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl font-bold transition text-xs flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Imprimir Extrato
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedComanda(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl font-bold transition text-xs"
                >
                  Fechar
                </button>

                <button
                  onClick={() => {
                    const c = selectedComanda;
                    setSelectedComanda(null);
                    handleChargeComanda(c);
                  }}
                  disabled={!selectedComanda.items || selectedComanda.items.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShoppingBag size={16} /> Cobrar / Ir para o Caixa
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
