import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PackagePlus, X, Loader2, Save } from 'lucide-react';

export function AddProductModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    barcode: '',
    priceCost: '',
    priceSell: '',
    stock: '',
    categoryId: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', shortCode: '', barcode: '', priceCost: '', priceSell: '', stock: '', categoryId: '' });
      api.get('/categories').then(res => {
        setCategories(res.data);
        if (res.data.length > 0) setFormData(f => ({ ...f, categoryId: res.data[0].id }));
      }).catch(() => toast.error('Falha ao carregar categorias do banco'));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/products', {
        name: formData.name,
        shortCode: formData.shortCode,
        barcode: formData.barcode,
        priceCost: parseFloat(formData.priceCost) || 0,
        priceSell: parseFloat(formData.priceSell) || 0,
        stock: parseInt(formData.stock) || 0,
        categoryId: formData.categoryId
      });
      toast.success('Produto Inserido no Catálogo!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao cadastrar produto. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-zinc-950 border-l border-zinc-800 w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-3"><PackagePlus className="text-blue-500" /> Novo Produto</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Nome do Produto *</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Cerveja Heineken 330ml"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Cód. Barras (EAN)</label>
            <input 
              type="text" 
              placeholder="Ex: 789101010"
              value={formData.barcode}
              onChange={e => setFormData({...formData, barcode: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Preço de Custo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                <input required type="number" step="0.01" value={formData.priceCost} onChange={e => setFormData({...formData, priceCost: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Preço de Venda *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                <input required type="number" step="0.01" value={formData.priceSell} onChange={e => setFormData({...formData, priceSell: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Estoque Inicial *</label>
              <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-1.5 block">Categoria *</label>
              <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500">
                <option value="" disabled>Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

        </form>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Salvar Produto</>}
          </button>
        </div>

      </div>
    </div>
  );
}
