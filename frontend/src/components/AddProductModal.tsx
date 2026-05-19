'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PackagePlus, X, Loader2, Save, DollarSign, Barcode, CheckCircle2, HelpCircle } from 'lucide-react';

const UNIT_OPTIONS = ['UN', 'KG', 'LT', 'CX', 'DZ', 'PCT', 'FD', 'ML', 'GR'];
const ORIGEM_OPTIONS = [
  { value: 0, label: '0 — Nacional' },
  { value: 1, label: '1 — Estrangeira (Importação direta)' },
  { value: 2, label: '2 — Estrangeira (Mercado interno)' },
  { value: 3, label: '3 — Nacional (Conteúdo importado > 40%)' },
];

interface GrupoTributacao { id: string; nome: string; csosn?: string; cfop: string; aliqIcms?: string; }

export function AddProductModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [grupos, setGrupos] = useState<GrupoTributacao[]>([]);
  const [loading, setLoading] = useState(false);

  // ── EAN Lookup state ──────────────────────────────────────
  const [eanStatus, setEanStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [eanLookupInfo, setEanLookupInfo] = useState<string | null>(null);
  const eanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emptyForm = {
    name: '', barcode: '', unit: 'UN',
    priceCost: '', priceSell: '', stock: '', categoryId: '',
    ncm: '', cest: '', origem: 0, grupoTributacaoId: '', imageUrl: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(emptyForm);
    Promise.all([
      api.get('/categories'),
      api.get('/tributacao'),
    ]).then(([catRes, grupRes]) => {
      setCategories(catRes.data);
      setGrupos(grupRes.data);
      if (catRes.data.length > 0) setFormData(f => ({ ...f, categoryId: catRes.data[0].id }));
    }).catch(() => toast.error('Erro ao carregar dados auxiliares'));
  }, [isOpen]);

  // ── EAN Lookup handler ───────────────────────────────────
  const handleEanChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, barcode: value }));
    setEanStatus('idle');
    setEanLookupInfo(null);

    if (eanDebounceRef.current) clearTimeout(eanDebounceRef.current);

    // Aguarda pelo menos 8 dígitos para disparar o lookup (EAN-8, EAN-13, EAN-14)
    const clean = value.trim().replace(/\D/g, '');
    if (clean.length < 8 || clean.length > 14) return;

    eanDebounceRef.current = setTimeout(async () => {
      setEanStatus('loading');
      try {
        const res = await api.get(`/products/lookup/${clean}`);
        const product = res.data.data;

        if (product) {
          // Preenche automaticamente os campos — mantém editáveis
          setFormData(prev => ({
            ...prev,
            name: prev.name || product.name,          // só preenche se vazio
            ncm:  prev.ncm  || product.ncm  || '',
            cest: prev.cest || product.cest || '',
            unit: product.unit || prev.unit,
            imageUrl: product.imageUrl || prev.imageUrl,
          }));
          setEanStatus('found');
          setEanLookupInfo(`${product.name}${product.brand ? ` · ${product.brand}` : ''}`);
        } else {
          setEanStatus('not_found');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setEanStatus('not_found');
        } else {
          setEanStatus('idle');
          toast.error(`Erro no lookup: ${err.message}`);
        }
      }
    }, 400);
  }, []);

  if (!isOpen) return null;

  const f = (key: string, val: unknown) => setFormData(prev => ({ ...prev, [key]: val }));

  // Margem estimada
  const cost = parseFloat(formData.priceCost) || 0;
  const sell = parseFloat(formData.priceSell) || 0;
  const markup = cost > 0 && sell > cost ? (((sell - cost) / cost) * 100).toFixed(1) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Nome da Mercadoria é obrigatório.'); return; }
    if (!formData.categoryId) { toast.error('Selecione uma Categoria.'); return; }
    if (!formData.priceSell) { toast.error('Preço de Venda é obrigatório.'); return; }

    setLoading(true);
    try {
      await api.post('/products', {
        name:              formData.name,
        // shortCode omitido — gerado automaticamente pelo sistema
        barcode:           formData.barcode   || undefined,
        unit:              formData.unit       || 'UN',
        priceCost:         parseFloat(formData.priceCost)  || 0,
        priceSell:         parseFloat(formData.priceSell)  || 0,
        stock:             parseFloat(formData.stock)      || 0,
        categoryId:        formData.categoryId,
        ncm:               formData.ncm       || undefined,
        cest:              formData.cest      || undefined,
        origem:            formData.origem,
        grupoTributacaoId: formData.grupoTributacaoId || undefined,
        imageUrl:          formData.imageUrl  || undefined,
      });
      toast.success('Produto cadastrado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string }; status?: number } };
      const status  = apiErr.response?.status;
      const message = apiErr.response?.data?.message;
      if (status === 409) {
        toast.error(message || 'Já existe um produto com este nome. Escolha outro nome.');
      } else {
        toast.error(message || 'Erro ao cadastrar produto.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm placeholder-zinc-600';
  const labelCls = 'text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 block';
  const sectionCls = 'bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 space-y-4';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-zinc-800 bg-zinc-950/70 shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <PackagePlus className="text-blue-500" size={24} />
            Novo Produto
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Form — único, scrollável */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">

          {/* ── DADOS PRINCIPAIS ──────────────────────────────── */}
          <div className={sectionCls}>
            <p className="text-[11px] font-black uppercase tracking-widest text-blue-400 border-b border-zinc-800 pb-2 mb-1">Dados Principais</p>

            <div>
              <label className={labelCls}>Nome da Mercadoria <span className="text-red-500">*</span></label>
              <input
                required
                className={inputCls}
                placeholder="Ex: Cerveja Heineken Long Neck 330ml"
                value={formData.name}
                onChange={e => f('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Preço de Venda <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                  <input
                    required
                    type="number" step="0.01" min="0"
                    className={`${inputCls} pl-9 text-emerald-400 font-black`}
                    placeholder="0.00"
                    value={formData.priceSell}
                    onChange={e => f('priceSell', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Categoria <span className="text-red-500">*</span></label>
                <select required className={inputCls} value={formData.categoryId} onChange={e => f('categoryId', e.target.value)}>
                  <option value="" disabled>Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} htmlFor="add-product-barcode">
                  <span className="flex items-center gap-1.5">
                    <Barcode size={12} className="text-zinc-500" />
                    Cód. Barras (EAN-13)
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="add-product-barcode"
                    className={`${inputCls} font-mono pr-10`}
                    placeholder="Bipe ou digite 13 dígitos..."
                    value={formData.barcode}
                    onChange={e => handleEanChange(e.target.value)}
                    maxLength={14}
                  />
                  {/* Indicador de status do lookup */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {eanStatus === 'loading' && (
                      <Loader2 size={16} className="animate-spin text-blue-400" />
                    )}
                    {eanStatus === 'found' && (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    )}
                    {eanStatus === 'not_found' && (
                      <HelpCircle size={16} className="text-zinc-500" />
                    )}
                  </div>
                </div>
                {/* Badge de feedback do lookup */}
                {eanStatus === 'found' && eanLookupInfo && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 size={11} />
                    <span className="truncate">Identificado: {eanLookupInfo}</span>
                  </div>
                )}
                {eanStatus === 'not_found' && (
                  <div className="mt-1.5 text-[11px] text-zinc-500 font-medium">
                    EAN não encontrado na base mestre — preencha manualmente.
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>Unidade de Venda</label>
                <select className={inputCls} value={formData.unit} onChange={e => f('unit', e.target.value)}>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── PREÇOS & ESTOQUE ──────────────────────────────── */}
          <div className={sectionCls}>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400 border-b border-zinc-800 pb-2 mb-1">Preços & Estoque</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Custo de Compra</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">R$</span>
                  <input
                    type="number" step="0.01" min="0"
                    className={`${inputCls} pl-9 text-rose-400 font-bold`}
                    placeholder="0.00"
                    value={formData.priceCost}
                    onChange={e => f('priceCost', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Estoque Inicial</label>
                <input
                  type="number" step="0.001" min="0"
                  className={`${inputCls} text-blue-400 font-bold`}
                  placeholder="0"
                  value={formData.stock}
                  onChange={e => f('stock', e.target.value)}
                />
              </div>
            </div>

            {/* Markup indicator */}
            {markup !== null && (
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2">
                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-emerald-500" /> Markup Bruto Estimado
                </span>
                <span className={`text-base font-black ${Number(markup) > 30 ? 'text-emerald-400' : 'text-yellow-500'}`}>
                  {markup}%
                </span>
              </div>
            )}
          </div>

          {/* ── FISCAL ─────────────────────────────────────────── */}
          <div className={sectionCls}>
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 border-b border-zinc-800 pb-2 mb-1">Fiscal / NFC-e</p>

            <div>
              <label className={labelCls}>Grupo Tributário</label>
              <select
                className={`${inputCls} border-indigo-500/30`}
                value={formData.grupoTributacaoId}
                onChange={e => f('grupoTributacaoId', e.target.value)}
              >
                <option value="">— Sem Grupo Fiscal —</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.nome} (CFOP {g.cfop})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>NCM <span className="text-zinc-600 normal-case">(8 dígitos)</span></label>
                <input
                  className={`${inputCls} font-mono`}
                  placeholder="Ex: 22030000"
                  maxLength={8}
                  value={formData.ncm}
                  onChange={e => f('ncm', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>CEST <span className="text-zinc-600 normal-case">(7 dígitos)</span></label>
                <input
                  className={`${inputCls} font-mono`}
                  placeholder="Ex: 0300500"
                  maxLength={7}
                  value={formData.cest}
                  onChange={e => f('cest', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Origem da Mercadoria</label>
              <select
                className={inputCls}
                value={formData.origem}
                onChange={e => f('origem', parseInt(e.target.value))}
              >
                {ORIGEM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 shrink-0">
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Salvar Produto</>}
          </button>
        </div>

      </div>
    </div>
  );
}
