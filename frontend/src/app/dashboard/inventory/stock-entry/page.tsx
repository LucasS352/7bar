"use client";
import { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft, PackagePlus, Search, Loader2, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  stock: number;
  unit: string;
  priceCost: number;
  category?: { name: string };
  shortCode?: string | null;
}

interface StockRow {
  product: Product;
  qty: string;   // Controlled como string para o input
  costPrice: string; // Controlled como string para o input
  saving: boolean;
  saved: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StockEntryPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [rows,       setRows]       = useState<StockRow[]>([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products?limit=2000');
      // A API retorna { data: [...], total, page } — extraímos o array
      const list = (res.data as any)?.data ?? res.data ?? [];
      setProducts((list as Product[]).filter(p => p !== null));
    } catch {
      toast.error('Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Filtro de busca inteligente ───────────────────────────────────────────
  const deferredSearch = useDeferredValue(search);
  
  const filtered = useMemo(() => {
    const normalizeStr = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const searchTerms = normalizeStr(deferredSearch).split(' ').filter(t => t.trim() !== '');
    return products.filter(p => {
      if (searchTerms.length === 0) return true;
      const searchString = normalizeStr(`${p.name} ${p.shortCode || ''}`);
      return searchTerms.every(term => searchString.includes(term));
    });
  }, [products, deferredSearch]);

  // ── Gerenciar linhas de entrada ───────────────────────────────────────────

  /** Adiciona produto à lista de entrada se não estiver lá */
  const addToEntry = (product: Product) => {
    if (rows.find(r => r.product.id === product.id)) return; // já na lista
    setRows(prev => [...prev, { product, qty: '', costPrice: product.priceCost?.toString() || '', saving: false, saved: false }]);
    setSearch(''); // limpa busca ao adicionar
  };

  const updateQty = (productId: string, qty: string) => {
    setRows(prev => prev.map(r => r.product.id === productId ? { ...r, qty, saved: false } : r));
  };

  const updateCostPrice = (productId: string, costPrice: string) => {
    setRows(prev => prev.map(r => r.product.id === productId ? { ...r, costPrice, saved: false } : r));
  };

  const removeRow = (productId: string) => {
    setRows(prev => prev.filter(r => r.product.id !== productId));
  };

  /** Confirma a entrada de um item específico */
  const confirmEntry = async (productId: string) => {
    const row = rows.find(r => r.product.id === productId);
    if (!row) return;

    const qty = parseInt(row.qty, 10);
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade válida (número inteiro maior que zero).');
      return;
    }

    const costNum = parseFloat(row.costPrice);
    if (isNaN(costNum) || costNum < 0) {
      toast.error('Informe um preço de custo válido.');
      return;
    }

    setRows(prev => prev.map(r => r.product.id === productId ? { ...r, saving: true } : r));

    try {
      await api.post(`/products/add-stock/${productId}`, {
        quantity: qty,
        costPrice: costNum,
        reason: 'Entrada de Estoque — Reposição via App',
      });

      toast.success(`+${qty} unidades adicionadas a "${row.product.name}"!`);

      setRows(prev => prev.map(r =>
        r.product.id === productId
          ? { 
              ...r, 
              saving: false, 
              saved: true, 
              qty: '', 
              product: { 
                ...r.product, 
                stock: Number(r.product.stock) + qty,
                priceCost: costNum
              } 
            }
          : r
      ));

      // Atualiza o estoque local e custo imediatamente
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock: Number(p.stock) + qty, priceCost: costNum } : p
      ));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao registrar entrada.');
      setRows(prev => prev.map(r => r.product.id === productId ? { ...r, saving: false } : r));
    }
  };

  /** Confirma todas as entradas de uma vez */
  const confirmAll = async () => {
    const pending = rows.filter(r => parseInt(r.qty, 10) > 0 && !r.saved);
    if (pending.length === 0) {
      toast.warning('Nenhuma quantidade preenchida para confirmar.');
      return;
    }
    for (const row of pending) {
      await confirmEntry(row.product.id);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/dashboard/inventory" className="text-zinc-500 hover:text-blue-400 flex items-center gap-2 text-sm font-semibold mb-2 transition-colors">
            <ArrowLeft size={16} /> Voltar ao Catálogo
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <PackagePlus className="text-emerald-500" size={32} /> Entrada de Estoque
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Busque o produto e informe a quantidade recebida. A operação soma ao estoque existente de forma segura.
          </p>
        </div>

        {rows.some(r => parseFloat(r.qty) > 0 && !r.saved) && (
          <button
            onClick={confirmAll}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <CheckCircle2 size={20} /> Confirmar Todos
          </button>
        )}
      </div>

      {/* Busca de produtos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <label className="text-sm font-bold text-zinc-400 mb-3 block">
          Buscar produto para adicionar à lista de entrada:
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Nome ou código curto do produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pl-10 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Resultados da busca */}
        {search.length > 0 && (
          <div className="mt-3 border border-zinc-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-zinc-500 text-sm p-4 text-center">Nenhum produto encontrado.</p>
            ) : (
              filtered.slice(0, 10).map(product => (
                <button
                  key={product.id}
                  onClick={() => addToEntry(product)}
                  disabled={rows.some(r => r.product.id === product.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/50 last:border-0 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div>
                    <p className="text-white font-semibold text-sm">{product.name}</p>
                    <p className="text-zinc-500 text-xs">{product.category?.name} • Estoque atual: <span className={`font-bold ${Number(product.stock) <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{Number(product.stock)}</span> {product.unit}</p>
                  </div>
                  <Plus size={20} className="text-emerald-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lista de entradas */}
      {rows.length > 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
            <h2 className="font-bold text-white">Lista de Entrada ({rows.length} {rows.length === 1 ? 'item' : 'itens'})</h2>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {rows.map(row => (
              <div key={row.product.id} className={`px-6 py-4 flex items-center gap-4 transition-colors ${row.saved ? 'bg-emerald-950/20' : 'hover:bg-zinc-800/30'}`}>

                {/* Info do produto */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{row.product.name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Estoque atual: <span className={`font-bold ${Number(row.product.stock) <= 0 ? 'text-red-400' : 'text-zinc-300'}`}>{Number(row.product.stock)}</span> {row.product.unit}
                  </p>
                </div>

                {/* Inputs de Entrada (Quantidade e Custo) */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Campo de quantidade */}
                  <div className="flex items-center gap-2">
                    <label className="text-zinc-500 text-sm font-semibold whitespace-nowrap">Qtd. a Adicionar:</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0"
                      value={row.qty}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updateQty(row.product.id, val);
                      }}
                      onKeyDown={e => e.key === 'Enter' && confirmEntry(row.product.id)}
                      disabled={row.saving || row.saved}
                      className="w-24 bg-zinc-950 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl px-2 py-2 text-emerald-400 font-black text-lg text-center focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>

                  {/* Campo de custo de aquisição */}
                  <div className="flex items-center gap-2">
                    <label className="text-zinc-500 text-sm font-semibold whitespace-nowrap">Custo Unitário:</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.costPrice}
                        onChange={e => updateCostPrice(row.product.id, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && confirmEntry(row.product.id)}
                        disabled={row.saving || row.saved}
                        className="w-28 bg-zinc-950 border-2 border-zinc-700 focus:border-emerald-500 rounded-xl pl-7 pr-2 py-2 text-rose-400 font-black text-lg text-center focus:outline-none transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão confirmar */}
                {row.saved ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm whitespace-nowrap">
                    <CheckCircle2 size={18} /> Salvo!
                  </span>
                ) : (
                  <button
                    onClick={() => confirmEntry(row.product.id)}
                    disabled={row.saving || !row.qty || parseInt(row.qty, 10) <= 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                  >
                    {row.saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Confirmar
                  </button>
                )}

                {/* Remover linha */}
                <button
                  onClick={() => removeRow(row.product.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                  title="Remover da lista"
                >
                  <AlertTriangle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <PackagePlus size={48} className="mb-4 opacity-30" />
          <p className="text-lg">Busque um produto acima para começar a entrada.</p>
          <p className="text-sm mt-1 opacity-70">Você pode adicionar vários produtos antes de confirmar.</p>
        </div>
      )}
    </div>
  );
}
