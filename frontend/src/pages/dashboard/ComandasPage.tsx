import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  User, Search, Plus, Trash2, CheckCircle2, AlertCircle, 
  ChevronRight, Calendar, DollarSign, X, Loader2, ArrowLeft, RefreshCw
} from 'lucide-react';

interface OperatorConsumption {
  id: string;
  name: string;
  pendingBalance: number;
}

interface ConsumptionItem {
  id: string;
  name: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
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
  active: boolean;
}

export function ComandasPage() {
  const [operators, setOperators] = useState<OperatorConsumption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selected Operator details
  const [selectedOperator, setSelectedOperator] = useState<OperatorConsumption | null>(null);
  const [history, setHistory] = useState<ConsumptionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  // Manual Launch Modal state
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [launchOperatorId, setLaunchOperatorId] = useState('');
  const [launchProductId, setLaunchProductId] = useState('');
  const [launchQuantity, setLaunchQuantity] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Fetch summary of all operators
  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operators/consumptions');
      setOperators(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar comandas dos funcionários.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for manual launch select
  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=1000');
      setProducts(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchProducts();
  }, []);

  // Fetch detailed history of selected operator
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

  // Handle Quitar / Settle Balance
  const handleSettle = async (operatorId: string) => {
    if (!window.confirm('Tem certeza que deseja liquidar todo o saldo devedor deste colaborador?')) return;
    try {
      await api.post(`/operators/consumptions/${operatorId}/settle`);
      toast.success('Comanda liquidada com sucesso!');
      fetchOperators();
      if (selectedOperator && selectedOperator.id === operatorId) {
        setSelectedOperator(prev => prev ? { ...prev, pendingBalance: 0 } : null);
        fetchOperatorHistory(operatorId);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao liquidar comanda.');
    }
  };

  // Handle Remove / Delete specific consumption item
  const handleDeleteItem = async (consumptionId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento? O produto correspondente voltará ao estoque.')) return;
    try {
      await api.delete(`/operators/consumptions/${consumptionId}`);
      toast.success('Lançamento removido com sucesso!');
      fetchOperators();
      if (selectedOperator) {
        fetchOperatorHistory(selectedOperator.id);
        // Refresh the selected operator summary to update the balance
        const res = await api.get('/operators/consumptions');
        const updatedOp = (res.data || []).find((o: any) => o.id === selectedOperator.id);
        if (updatedOp) {
          setSelectedOperator(updatedOp);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir lançamento.');
    }
  };

  // Handle manual consumption launching
  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchOperatorId || !launchProductId || launchQuantity <= 0) {
      toast.error('Preencha todos os campos corretamente.');
      return;
    }
    setLaunching(true);
    try {
      await api.post('/operators/consumptions/manual', {
        operatorId: launchOperatorId,
        productId: launchProductId,
        quantity: launchQuantity
      });
      toast.success('Consumo registrado com sucesso!');
      setIsLaunchModalOpen(false);
      setLaunchProductId('');
      setLaunchQuantity(1);
      setProductSearch('');
      fetchOperators();
      if (selectedOperator && selectedOperator.id === launchOperatorId) {
        fetchOperatorHistory(launchOperatorId);
        // Refresh selected operator balance
        const res = await api.get('/operators/consumptions');
        const updatedOp = (res.data || []).find((o: any) => o.id === selectedOperator.id);
        if (updatedOp) setSelectedOperator(updatedOp);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar consumo.');
    } finally {
      setLaunching(false);
    }
  };

  // Filtered operators
  const filteredOperators = useMemo(() => {
    return operators.filter(op => op.name.toLowerCase().includes(search.toLowerCase().trim()));
  }, [operators, search]);

  // Filtered products for select dropdown search
  const filteredProducts = useMemo(() => {
    const s = productSearch.toLowerCase().trim();
    if (!s) return products.filter(p => p.active !== false);
    return products.filter(p => p.active !== false && p.name.toLowerCase().includes(s));
  }, [products, productSearch]);

  // Selected product price display
  const selectedProductPrice = useMemo(() => {
    const prod = products.find(p => p.id === launchProductId);
    return prod ? Number(prod.priceSell) : 0;
  }, [products, launchProductId]);

  // Global Pending Balance sum
  const globalPendingBalance = useMemo(() => {
    return operators.reduce((sum, op) => sum + Number(op.pendingBalance), 0);
  }, [operators]);

  // Filter history items by status checkbox
  const filteredHistory = useMemo(() => {
    if (showOnlyPending) {
      return history.filter(h => !h.settled);
    }
    return history;
  }, [history, showOnlyPending]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Comandas de Funcionários
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Gerencie consumos internos e descontos em folha dos colaboradores.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsLaunchModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition font-bold active:scale-[0.98]"
          >
            <Plus size={18} /> Lançar Consumo
          </button>
          <button 
            onClick={fetchOperators}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl transition"
            title="Atualizar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Saldo Devedor Acumulado</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-500">R$ {globalPendingBalance.toFixed(2)}</span>
            <span className="text-zinc-500 text-xs font-medium">pendente de acerto</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block">Funcionários Ativos</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl sm:text-4xl font-black text-white">{operators.length}</span>
            <span className="text-zinc-500 text-xs font-medium">com acesso cadastrado</span>
          </div>
        </div>
      </div>

      {/* Main Content Split: List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Operators List */}
        <div className={`${selectedOperator ? 'hidden lg:block lg:col-span-5' : 'col-span-12'} bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 sm:p-6 backdrop-blur-md`}>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-3">
                <Loader2 size={36} className="animate-spin text-blue-500" />
                <p className="text-sm">Carregando colaboradores...</p>
              </div>
            ) : filteredOperators.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <p>Nenhum colaborador encontrado.</p>
              </div>
            ) : (
              filteredOperators.map(op => {
                const isActive = selectedOperator?.id === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperator(op)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                      isActive 
                        ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-md' 
                        : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
                        <User size={18} className={isActive ? 'text-blue-400' : 'text-zinc-400'} />
                      </div>
                      <div>
                        <span className="font-bold block leading-tight">{op.name}</span>
                        <span className="text-xs text-zinc-500">Clique para ver histórico</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-sm px-3 py-1 rounded-full ${
                        Number(op.pendingBalance) > 0 
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold' 
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                      }`}>
                        R$ {Number(op.pendingBalance).toFixed(2)}
                      </span>
                      <ChevronRight size={16} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Operator Details / History */}
        {selectedOperator && (
          <div className="col-span-12 lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 backdrop-blur-md space-y-6">
            
            {/* Detail Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                {/* Back button visible only on mobile */}
                <button 
                  onClick={() => setSelectedOperator(null)}
                  className="lg:hidden p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{selectedOperator.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Histórico e faturas do colaborador</p>
                </div>
              </div>

              {selectedOperator.pendingBalance > 0 && (
                <button
                  onClick={() => handleSettle(selectedOperator.id)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition text-xs font-bold"
                >
                  Quitar Saldo (R$ {selectedOperator.pendingBalance.toFixed(2)})
                </button>
              )}
            </div>

            {/* View filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyPending}
                  onChange={e => setShowOnlyPending(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-blue-600 accent-blue-500"
                />
                Exibir apenas itens pendentes de acerto
              </label>
              <div className="text-xs text-zinc-500">
                Mostrando {filteredHistory.length} registros
              </div>
            </div>

            {/* Extrato / List of consumptions */}
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
                  <Loader2 size={36} className="animate-spin text-blue-500" />
                  <p className="text-sm">Carregando extrato...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                  <AlertCircle size={32} className="mx-auto mb-3 opacity-30 text-zinc-400" />
                  <p className="text-sm">Nenhum consumo registrado neste filtro.</p>
                </div>
              ) : (
                filteredHistory.map(rec => (
                  <div key={rec.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3 relative group">
                    
                    {/* Header of card */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar size={14} />
                        <span>{new Date(rec.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          rec.settled 
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {rec.settled ? 'Pago' : 'Pendente'}
                        </span>
                        
                        {/* Remove Button for Admin correction */}
                        <button
                          onClick={() => handleDeleteItem(rec.id)}
                          className="text-zinc-500 hover:text-red-400 transition p-1 bg-zinc-900 border border-zinc-800 hover:border-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Excluir este lançamento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Products details */}
                    <div className="divide-y divide-zinc-900">
                      {rec.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 text-sm">
                          <div>
                            <span className="font-semibold text-zinc-200">{item.name}</span>
                            <span className="text-xs text-zinc-500 block">{item.quantity} UN x R$ {item.priceUnit.toFixed(2)}</span>
                          </div>
                          <span className="font-bold text-zinc-100">R$ {item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer / total */}
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900 text-xs">
                      <span className="text-zinc-500">Valor Total Lançado</span>
                      <span className="font-bold text-sm text-amber-400">R$ {rec.total.toFixed(2)}</span>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>

      {/* Manual Launch Modal */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h4 className="font-bold text-xl text-white">Lançar Consumo Interno</h4>
              <button 
                onClick={() => { setIsLaunchModalOpen(false); setLaunchProductId(''); setProductSearch(''); }} 
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLaunch} className="p-6 space-y-4">
              
              {/* Operator select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Colaborador</label>
                <select
                  value={launchOperatorId}
                  onChange={e => setLaunchOperatorId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Selecione o colaborador...</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>

              {/* Product select & search */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Produto</label>
                <input
                  type="text"
                  placeholder="Pesquisar produto..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-t-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-xs border-b-0 font-medium"
                />
                <select
                  value={launchProductId}
                  onChange={e => setLaunchProductId(e.target.value)}
                  size={5}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-b-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm select-scroll-fix custom-scrollbar"
                  required
                >
                  <option value="" disabled className="text-zinc-600">Selecione o produto abaixo...</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (R$ {Number(p.priceSell).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={launchQuantity}
                    onChange={e => setLaunchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm font-bold"
                    required
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Calculado</span>
                  <span className="text-lg font-black text-amber-400 mb-2">
                    R$ {(selectedProductPrice * launchQuantity).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={launching || !launchOperatorId || !launchProductId}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition active:scale-95 flex items-center justify-center gap-2"
                >
                  {launching ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirmar Lançamento
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
