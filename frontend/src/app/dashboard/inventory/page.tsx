"use client";
import { useEffect, useState, useCallback, useDeferredValue, useMemo } from 'react';
import { api } from '@/lib/api';
import { Package, Search, Edit3, Loader2, DollarSign, TrendingUp, BarChart3, AlertOctagon, Plus, PackagePlus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { useAuthStore } from '@/store/auth';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface GrupoTributacao { nome: string }

interface Product {
  id: string;
  name: string;
  priceCost: number;
  priceSell: number;
  stock: number;
  barcode: string | null;
  shortCode: string | null;
  active: boolean;
  ncm?: string | null;
  grupoTributacaoId?: string | null;
  grupoTributacao?: GrupoTributacao | null;
  imageUrl?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [products,            setProducts]            = useState<Product[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [search,              setSearch]              = useState('');
  const [isAddOpen,           setIsAddOpen]           = useState(false);
  const [editingProduct,      setEditingProduct]      = useState<Product | null>(null);
  const [allowNegativeStock,  setAllowNegativeStock]  = useState(false);
  const [savingSettings,      setSavingSettings]      = useState(false);
  const [showLowStockAlert,   setShowLowStockAlert]   = useState(false);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.get('/products?limit=2000')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data as any).data;
        setProducts(data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Busca configurações do tenant ao montar
  useEffect(() => {
    fetchProducts();
    if (isAdmin) {
      api.get<{ allowNegativeStock: boolean }>('/products/settings')
        .then(res => setAllowNegativeStock(res.data.allowNegativeStock))
        .catch(console.error);
    }
  }, [fetchProducts, isAdmin]);

  const handleToggleNegativeStock = async (value: boolean) => {
    setSavingSettings(true);
    try {
      await api.patch('/products/settings', { allowNegativeStock: value });
      setAllowNegativeStock(value);
      toast.success(value
        ? 'Venda sem estoque ATIVADA — o PDV agora permite estoque negativo.'
        : 'Venda sem estoque DESATIVADA — o PDV vai bloquear quando zerar.'
      );
    } catch {
      toast.error('Erro ao salvar configuração.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/products/${id}`, { active: !currentStatus });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      toast.success(currentStatus ? 'Produto inativado e oculto no PDV.' : 'Produto reativado no catálogo!');
    } catch {
      toast.error('Erro ao mudar status do produto');
    }
  };

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const displayedProducts = useMemo(() => {
    const normalizeStr = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const searchTerms = normalizeStr(debouncedSearch).split(' ').filter(t => t.trim() !== '');
    
    const filtered = products.filter(p => {
      if (searchTerms.length === 0) return true;
      const searchString = normalizeStr(`${p.name} ${p.barcode || ''} ${p.shortCode || ''}`);
      return searchTerms.every(term => searchString.includes(term));
    });
    
    // Limita a exibição da tabela para não travar o navegador com milhares de linhas de DOM
    return filtered.slice(0, 100);
  }, [products, debouncedSearch]);

  const { totalVarieties, totalItemsCount, totalGrossValue, totalCostValue, expectedProfit, lowStockProducts } = useMemo(() => {
    const totalVarieties  = products.length;
    let totalItemsCount = 0;
    let totalGrossValue = 0;
    let totalCostValue  = 0;
    const lowStockProducts = [];

    for (const p of products) {
      const stock = Number(p.stock);
      totalItemsCount += stock;
      totalGrossValue += Number(p.priceSell) * stock;
      totalCostValue  += Number(p.priceCost || 0) * stock;
      if (stock <= 10) lowStockProducts.push(p);
    }
    const expectedProfit  = totalGrossValue - totalCostValue;

    return { totalVarieties, totalItemsCount, totalGrossValue, totalCostValue, expectedProfit, lowStockProducts };
  }, [products]);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={48} />
    </div>
  );



  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Package className="text-blue-500" size={32} /> Controle de Estoque
        </h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Link
            to="/dashboard/inventory/categories"
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition flex-1 md:flex-none justify-center text-sm md:text-base"
          >
            Categorias
          </Link>
          <Link
            to="/dashboard/inventory/stock-entry"
            className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition flex-1 md:flex-none justify-center text-sm md:text-base"
          >
            <PackagePlus size={20} /> <span className="hidden sm:inline">Entrada de Estoque</span><span className="sm:hidden">Entrada</span>
          </Link>
          <Link
            to="/dashboard/inventory/purchases"
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition flex-1 md:flex-none justify-center text-sm md:text-base whitespace-nowrap"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Novos Produtos (Fast Grid)</span><span className="sm:hidden">Grid Lote</span>
          </Link>
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition flex-1 md:flex-none justify-center text-sm md:text-base whitespace-nowrap"
          >
            <Plus size={20} /> Cadastrar Un.
          </button>
        </div>
      </div>

      {/* Alerta estoque baixo */}
      {lowStockProducts.length > 0 && (
        <div className="mb-4">
          <button 
            onClick={() => setShowLowStockAlert(!showLowStockAlert)}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-4 py-2 rounded-xl border border-red-500/20 transition-colors"
          >
            <AlertOctagon size={18} />
            {showLowStockAlert ? 'Ocultar Alerta de Reposição' : `Exibir Alerta de Reposição (${lowStockProducts.length} itens)`}
          </button>
          
          {showLowStockAlert && (
            <div className="mt-3 bg-red-500/10 border-l-4 border-l-red-500 p-5 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              <h3 className="text-red-400 font-bold text-lg mb-1 flex items-center gap-2">
                Alerta Crítico: Reposição Necessária
              </h3>
              <p className="text-red-400/80 text-sm mb-3">
                Foram detectados <strong>{lowStockProducts.length}</strong> produtos com estoque igual ou inferior a 10 unidades físicas. Realize um pedido de compra ao fornecedor em breve.
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSearch(p.name)}
                    title="Filtrar tabela por este item"
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 active:scale-95"
                  >
                    {p.name} <span className="bg-red-500/40 text-white px-1.5 py-0.5 rounded text-xs">{Math.round(Number(p.stock))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-5 rounded-2xl flex flex-col justify-center">
          <div className="text-zinc-400 font-medium text-xs md:text-sm flex items-center gap-2 mb-2"><Package size={16}/> SKUs / Físico</div>
          <div className="text-xl md:text-2xl font-black text-white">{totalVarieties} <span className="text-xs md:text-sm font-medium text-zinc-500">tipos</span> / {totalItemsCount} <span className="text-xs md:text-sm font-medium text-zinc-500">unid.</span></div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-rose-500/50">
          <div className="text-zinc-400 font-medium text-xs md:text-sm flex items-center gap-2 mb-2"><BarChart3 size={16} className="text-rose-400"/> <span className="hidden sm:inline">Custo Imobilizado</span><span className="sm:hidden">Custo</span></div>
          <div className="text-xl md:text-2xl font-black text-rose-400 truncate">R$ {totalCostValue.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-blue-500/50">
          <div className="text-zinc-400 font-medium text-xs md:text-sm flex items-center gap-2 mb-2"><DollarSign size={16} className="text-blue-400"/> <span className="hidden sm:inline">Valor Bruto de Venda</span><span className="sm:hidden">Varejo</span></div>
          <div className="text-xl md:text-2xl font-black text-blue-400 truncate">R$ {totalGrossValue.toFixed(2)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-emerald-500/50">
          <div className="text-zinc-400 font-medium text-xs md:text-sm flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-400"/> Lucro Projetado</div>
          <div className="text-xl md:text-2xl font-black text-emerald-400 truncate">R$ {expectedProfit.toFixed(2)}</div>
        </div>
      </div>

      {/* Busca + Toggle Admin */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar no catálogo..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500 focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Toggle Vender sem Estoque — Exclusivo para Admin */}
          {isAdmin && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${allowNegativeStock ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-950/50 border-zinc-700'}`}>
              <ShieldAlert size={18} className={allowNegativeStock ? 'text-amber-400' : 'text-zinc-500'} />
              <span className={`text-sm font-bold ${allowNegativeStock ? 'text-amber-400' : 'text-zinc-500'}`}>
                Vender sem estoque
              </span>
              <button
                onClick={() => handleToggleNegativeStock(!allowNegativeStock)}
                disabled={savingSettings}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${allowNegativeStock ? 'bg-amber-500' : 'bg-zinc-700'} ${savingSettings ? 'opacity-50 cursor-wait' : ''}`}
                title={allowNegativeStock ? 'Clique para desativar venda sem estoque' : 'Clique para permitir venda sem estoque'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowNegativeStock ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Tabela de Produtos (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Produto</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Atalho</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Cód. Barras</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Custo</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Varejo</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Físico</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {displayedProducts.map(product => (
                <tr key={product.id} className={`hover:bg-zinc-800/40 transition-colors ${product.active === false ? 'opacity-40 grayscale' : ''}`}>
                  <td className="px-6 py-5 font-medium text-zinc-200">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <div className="w-10 h-10 shrink-0 bg-white rounded-lg flex items-center justify-center p-1 shadow-inner">
                          <img src={product.imageUrl} alt="" className="w-full h-full object-contain mix-blend-multiply" loading="lazy" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        {(!product.ncm || !product.grupoTributacaoId) && (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-500/80 uppercase font-bold mt-1" title="Faltam dados fiscais para emitir NFC-e">
                            <AlertOctagon size={12} /> Faltam Dados Fiscais
                          </span>
                        )}
                        {(product.ncm && product.grupoTributacaoId) && (
                          <span className="text-[10px] text-indigo-400/80 uppercase font-bold mt-1" title="Pronto para NFC-e">
                            {product.grupoTributacao?.nome || 'Fiscal OK'}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {product.shortCode ? (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-md font-black text-sm">{product.shortCode}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-5 text-zinc-500 text-sm font-mono">
                    {product.barcode || 'Sem Cód.'}
                  </td>
                  <td className="px-6 py-5 text-rose-400/80 font-medium text-right">
                    R$ {product.priceCost ? Number(product.priceCost).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-5 text-emerald-400 font-bold text-right">
                    R$ {Number(product.priceSell).toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={() => handleToggleActive(product.id, product.active !== false)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${product.active !== false ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      title={product.active !== false ? 'Clique para Inativar' : 'Clique para Ativar'}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.active !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-sm font-bold border ${Number(product.stock) <= 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : Number(product.stock) <= 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                      {Math.round(Number(product.stock))}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors inline-block"
                      title="Editar Produto"
                    >
                      <Edit3 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards de Produtos (Mobile) */}
        <div className="md:hidden flex flex-col divide-y divide-zinc-800/60">
          {displayedProducts.map(product => (
            <div key={product.id} className={`p-4 flex flex-col gap-3 ${product.active === false ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-3 flex-1">
                  {product.imageUrl && (
                    <div className="w-12 h-12 shrink-0 bg-white rounded-lg flex items-center justify-center p-1 shadow-inner">
                      <img src={product.imageUrl} alt="" className="w-full h-full object-contain mix-blend-multiply" loading="lazy" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-zinc-200 line-clamp-2">{product.name}</div>
                    <div className="text-sm font-mono text-zinc-500 mt-1">{product.barcode || 'Sem cód. barras'}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(product.id, product.active !== false)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${product.active !== false ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.active !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-bold items-center">
                {product.shortCode && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
                    Atalho: {product.shortCode}
                  </span>
                )}
                {(!product.ncm || !product.grupoTributacaoId) ? (
                  <span className="text-yellow-500/80 flex items-center gap-1"><AlertOctagon size={12}/> Faltam Dados</span>
                ) : (
                  <span className="text-indigo-400/80">{product.grupoTributacao?.nome || 'Fiscal OK'}</span>
                )}
              </div>

              <div className="flex justify-between items-end border-t border-zinc-800 pt-3 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500 text-xs">Preço Varejo</span>
                  <span className="text-emerald-400 font-bold text-lg">R$ {Number(product.priceSell).toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-sm font-bold border ${Number(product.stock) <= 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : Number(product.stock) <= 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    Estoque: {Math.round(Number(product.stock))}
                  </span>
                  
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="p-2 text-zinc-400 hover:text-blue-400 bg-zinc-800 hover:bg-blue-500/10 rounded-lg transition-colors border border-zinc-700"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {displayedProducts.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      </div>

      <AddProductModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={fetchProducts} />
      <EditProductModal product={editingProduct} isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} onSuccess={fetchProducts} />
    </div>
  );
}
