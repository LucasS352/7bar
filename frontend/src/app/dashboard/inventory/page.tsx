"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Package, Search, Edit3, Loader2, DollarSign, TrendingUp, BarChart3, AlertOctagon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';

type Product = {
  id: string;
  name: string;
  priceCost: number;
  priceSell: number;
  stock: number;
  barcode: string;
  shortCode: string | null;
  active: boolean;
};

export default function InventoryDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    api.get('/products')
      .then(res => setProducts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdateStock = async (id: string, newStock: number) => {
    try {
      await api.patch(`/products/${id}`, { stock: newStock });
      setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
      toast.success('Estoque atualizado!');
    } catch (err: any) {
      toast.error('Erro ao atualizar estoque');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/products/${id}`, { active: !currentStatus });
      setProducts(products.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
      toast.success(currentStatus ? 'Produto Inativado e Ocultado.' : 'Produto Reativado no Catálogo!');
    } catch (err: any) {
      toast.error('Erro ao mudar status do produto');
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  const totalVarieties = products.length;
  const totalItemsCount = products.reduce((acc, p) => acc + p.stock, 0);
  const totalGrossValue = products.reduce((acc, p) => acc + (p.priceSell * p.stock), 0);
  const totalCostValue = products.reduce((acc, p) => acc + ((p.priceCost || 0) * p.stock), 0);
  const expectedProfit = totalGrossValue - totalCostValue;
  const lowStockProducts = products.filter(p => p.stock <= 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Package className="text-blue-500" size={32} /> Controle de Estoque
        </h1>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/inventory/purchases"
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
          >
            <Plus size={20} /> Entrada de Lotes (Fast Grid)
          </a>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
          >
            <Plus size={20} /> Cadastrar Produto Un.
          </button>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-red-500/10 border-l-4 border-l-red-500 p-5 rounded-r-xl flex items-start gap-4 shadow-sm animate-in slide-in-from-top-4">
          <AlertOctagon className="text-red-500 mt-0.5" size={24} />
          <div>
            <h3 className="text-red-400 font-bold text-lg">Alerta Crítico: Reposição Necessária</h3>
            <p className="text-red-400/80 text-sm mt-1 mb-3">
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
                    {p.name} <span className="bg-red-500/40 text-white px-1.5 py-0.5 rounded text-xs">{p.stock}</span>
                 </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards KPI de Estoque */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-center">
          <div className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-2"><Package size={16}/> SKUs / Físico</div>
          <div className="text-2xl font-black text-white">{totalVarieties} <span className="text-sm font-medium text-zinc-500">tipos</span> / {totalItemsCount} <span className="text-sm font-medium text-zinc-500">unid.</span></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-rose-500/50">
          <div className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-2"><BarChart3 size={16} className="text-rose-400"/> Custo Imobilizado</div>
          <div className="text-2xl font-black text-rose-400">R$ {totalCostValue.toFixed(2)}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-blue-500/50">
          <div className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-2"><DollarSign size={16} className="text-blue-400"/> Valor Bruto de Venda</div>
          <div className="text-2xl font-black text-blue-400">R$ {totalGrossValue.toFixed(2)}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-center border-b-4 border-b-emerald-500/50">
          <div className="text-zinc-400 font-medium text-sm flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-400"/> Lucro Projetado</div>
          <div className="text-2xl font-black text-emerald-400">R$ {expectedProfit.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Busca e Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500" />
            </div>
            <input 
              type="text" 
              placeholder="Buscar no catálogo..." 
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-blue-500 text-white placeholder-zinc-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
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
              {filtered.map(product => (
                <tr key={product.id} className={`hover:bg-zinc-800/40 transition-colors ${product.active === false ? 'opacity-40 grayscale' : ''}`}>
                  <td className="px-6 py-5 font-medium text-zinc-200">
                    {product.name}
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
                    R$ {product.priceCost ? product.priceCost.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-5 text-emerald-400 font-bold text-right">
                    R$ {product.priceSell.toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => handleToggleActive(product.id, product.active !== false)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950 ${product.active !== false ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                      title={product.active !== false ? "Clique para Inativar" : "Clique para Ativar"}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.active !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-sm font-bold border ${product.stock <= 10 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                      {product.stock}
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
      </div>
      
      <AddProductModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={fetchProducts} 
      />

      <EditProductModal 
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
