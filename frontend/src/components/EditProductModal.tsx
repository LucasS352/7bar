'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Edit3, X, Loader2, Save, DollarSign, FileText, Tag, PackageOpen } from 'lucide-react';

const UNIT_OPTIONS = ['UN', 'KG', 'LT', 'CX', 'DZ', 'PCT', 'FD', 'ML', 'GR'];
const ORIGEM_OPTIONS = [
  { value: 0, label: '0 — Nacional' },
  { value: 1, label: '1 — Estrangeira (Importação direta)' },
  { value: 2, label: '2 — Estrangeira (Mercado interno)' },
  { value: 3, label: '3 — Nacional (Conteúdo importado > 40%)' },
];

interface GrupoTributacao { id: string; nome: string; cfop: string; }

interface ProductData {
  id: string;
  name: string;
  shortCode?: string | null;
  barcode?: string | null;
  unit?: string;
  priceCost?: number;
  priceSell?: number;
  stock?: number;
  categoryId?: string;
  ncm?: string | null;
  cest?: string | null;
  origem?: number;
  grupoTributacaoId?: string | null;
}

export function EditProductModal({
  product, isOpen, onClose, onSuccess,
}: {
  product: ProductData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [grupos, setGrupos] = useState<GrupoTributacao[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', barcode: '', unit: 'UN',
    priceCost: '', priceSell: '', stock: '', categoryId: '',
    ncm: '', cest: '', origem: 0, grupoTributacaoId: '',
  });

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name:               product.name          || '',
        barcode:            product.barcode        || '',
        unit:               product.unit           || 'UN',
        priceCost:          product.priceCost?.toString()  || '0',
        priceSell:          product.priceSell?.toString()  || '0',
        stock:              product.stock?.toString()       || '0',
        categoryId:         product.categoryId     || '',
        ncm:                product.ncm            || '',
        cest:               product.cest           || '',
        origem:             product.origem         ?? 0,
        grupoTributacaoId:  product.grupoTributacaoId || '',
      });

      Promise.all([
        api.get('/categories'),
        api.get('/tributacao'),
      ]).then(([catRes, grupRes]) => {
        setCategories(catRes.data);
        setGrupos(grupRes.data);
      }).catch(() => toast.error('Falha ao carregar dados auxiliares'));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const f = (key: string, val: unknown) => setFormData(prev => ({ ...prev, [key]: val }));

  const cost   = parseFloat(formData.priceCost) || 0;
  const sell   = parseFloat(formData.priceSell) || 0;
  const markup = cost > 0 && sell > cost ? (((sell - cost) / cost) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.categoryId) {
      toast.error('Nome e Categoria são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/products/${product.id}`, {
        name:               formData.name.trim(),
        barcode:            formData.barcode || undefined,
        unit:               formData.unit || 'UN',
        priceCost:          parseFloat(formData.priceCost) || 0,
        priceSell:          parseFloat(formData.priceSell) || 0,
        stock:              parseFloat(formData.stock) || 0,
        categoryId:         formData.categoryId,
        ncm:                formData.ncm || undefined,
        cest:               formData.cest || undefined,
        origem:             formData.origem,
        grupoTributacaoId:  formData.grupoTributacaoId || undefined,
        // shortCode é gerado automaticamente pelo sistema — não enviado pelo usuário
      });
      toast.success('Produto atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string }; status?: number } };
      toast.error(apiErr.response?.data?.message || 'Erro ao atualizar produto.');
    } finally {
      setLoading(false);
    }
  };

  const inp  = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm placeholder-zinc-600';
  const lbl  = 'text-xs font-semibold text-zinc-400 mb-1 block uppercase tracking-wide';
  const sect = 'bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-4';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-lg h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-800 bg-zinc-950/50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Edit3 className="text-blue-400" size={22} /> Editar Produto
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Atalho: <span className="font-mono text-zinc-400 font-bold">#{product.shortCode || 'Auto'}</span>
              {' '}— gerado pelo sistema, não editável.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form — único scroll, sem abas */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

          {/* ── Dados Principais ──────────────────────────────── */}
          <div className={sect}>
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <Tag size={16} className="text-blue-400" /> Dados Principais
            </h3>

            <div>
              <label className={lbl}>Nome da Mercadoria *</label>
              <input required className={inp} value={formData.name} onChange={e => f('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Cód. Barras (EAN)</label>
                <input className={`${inp} font-mono`} placeholder="789..." value={formData.barcode} onChange={e => f('barcode', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Unidade de Venda</label>
                <select className={inp} value={formData.unit} onChange={e => f('unit', e.target.value)}>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>Categoria *</label>
              <select required className={inp} value={formData.categoryId} onChange={e => f('categoryId', e.target.value)}>
                <option value="" disabled>Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* ── Preços & Estoque ──────────────────────────────── */}
          <div className={sect}>
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" /> Preços &amp; Estoque
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Custo de Compra</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">R$</span>
                  <input type="number" step="0.01" min="0" className={`${inp} pl-9 text-rose-400 font-bold`} value={formData.priceCost} onChange={e => f('priceCost', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Preço de Venda *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">R$</span>
                  <input required type="number" step="0.01" min="0" className={`${inp} pl-9 text-emerald-400 font-black`} value={formData.priceSell} onChange={e => f('priceSell', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Markup badge */}
            <div className="flex justify-between items-center py-2 border-t border-zinc-800/50">
              <span className="text-xs font-semibold text-zinc-500">Markup bruto:</span>
              <span className={`text-base font-black ${Number(markup) > 30 ? 'text-emerald-400' : 'text-yellow-400'}`}>{markup}%</span>
            </div>

            <div>
              <label className={lbl}>
                <PackageOpen size={12} className="inline mr-1" />
                Estoque Físico Atual
                <span className="ml-1 text-zinc-600 normal-case font-normal">(ajuste manual — use Entrada de Estoque para repor)</span>
              </label>
              <input type="number" step="0.001" min="0" className={`${inp} text-blue-400 font-bold`} value={formData.stock} onChange={e => f('stock', e.target.value)} />
            </div>
          </div>

          {/* ── Fiscal / NFC-e ────────────────────────────────── */}
          <div className={sect}>
            <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" /> Fiscal / NFC-e
              <span className="text-zinc-600 font-normal text-xs">(opcional)</span>
            </h3>

            <div>
              <label className={lbl}>Grupo Tributário</label>
              <select className={`${inp} border-indigo-500/20`} value={formData.grupoTributacaoId} onChange={e => f('grupoTributacaoId', e.target.value)}>
                <option value="">— Sem grupo fiscal —</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nome} (CFOP {g.cfop})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>NCM <span className="text-zinc-600">(8 dígitos)</span></label>
                <input className={`${inp} font-mono`} maxLength={8} placeholder="22030000" value={formData.ncm} onChange={e => f('ncm', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>CEST <span className="text-zinc-600">(7 dígitos)</span></label>
                <input className={`${inp} font-mono`} maxLength={7} placeholder="0300500" value={formData.cest} onChange={e => f('cest', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={lbl}>Origem da Mercadoria</label>
              <select className={inp} value={formData.origem} onChange={e => f('origem', parseInt(e.target.value))}>
                {ORIGEM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <button
            onClick={handleSubmit as React.MouseEventHandler}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-base bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.15)]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Alterações</>}
          </button>
        </div>

      </div>
    </div>
  );
}
