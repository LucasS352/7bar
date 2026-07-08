"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, ArrowLeft, Send, Upload, AlertTriangle, Info, Image, Loader2, X, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProductSuggestion {
  id: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
  barcode?: string;
  ncm?: string;
  cest?: string;
  origem: number;
  grupoTributacaoId?: string;
}

interface Row {
  id: number;
  shortCode: string;
  barcode: string;
  name: string;
  priceCost: string;
  priceSell: string;
  stockToAdd: string;
  categoryId: string;
  grupoTributacaoId: string;
  ncm: string;
  cest: string;
  origem: number;
  imageUrl: string;
  volumeUnit: string;
  volumeCapacity: string;
}

function makeRow(overrides?: Partial<Row>): Row {
  return {
    id: Date.now() + Math.random(),
    shortCode: '', barcode: '', name: '', priceCost: '', priceSell: '',
    stockToAdd: '', categoryId: '', grupoTributacaoId: '', ncm: '', cest: '',
    origem: 0, imageUrl: '', volumeUnit: '', volumeCapacity: '',
    ...overrides,
  };
}

// ─── Autocomplete Component ───────────────────────────────────────────────────
function NameAutocomplete({
  value, onChange, onSelect, suggestions, loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: ProductSuggestion) => void;
  suggestions: ProductSuggestion[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [globalSuggestions, setGlobalSuggestions] = useState<ProductSuggestion[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // If clicking inside the input container, ignore (handled by onFocus/onClick)
      if (ref.current && ref.current.contains(e.target as Node)) return;
      // If clicking inside the portal dropdown, ignore
      const dropdown = document.getElementById('autocomplete-portal-dropdown');
      if (dropdown && dropdown.contains(e.target as Node)) return;
      setOpen(false);
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    if (open) {
      updatePosition();
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('resize', handleScrollOrResize);
      // Listen to scroll on window and any scrollable parent (capture phase)
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setGlobalSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setGlobalLoading(true);
      try {
        const res = await api.get(`/products/global-catalog?q=${encodeURIComponent(value)}`);
        setGlobalSuggestions(res.data || []);
      } catch {
        setGlobalSuggestions([]);
      } finally {
        setGlobalLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value]);

  // Utiliza apenas os itens da Rede (Catálogo Global) conforme solicitado pelo usuário
  const allFiltered = globalSuggestions.map(g => ({
    ...g,
    categoryId: '',
    origem: 0, // Global items don't have local category
  }));
  const displayFiltered = allFiltered.slice(0, 8);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Nome do Produto"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); updatePosition(); }}
          className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
        />
        {(loading || globalLoading) && (
          <Loader2 size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
        )}
      </div>

      {open && displayFiltered.length > 0 && createPortal(
        <div id="autocomplete-portal-dropdown" style={dropdownStyle} className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Catálogo Unificado</span>
            {globalLoading && <span className="text-[9px] text-blue-400 animate-pulse">Buscando na rede...</span>}
          </div>
          <ul className="max-h-60 overflow-y-auto custom-scrollbar">
            {displayFiltered.map(p => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onSelect(p); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover border border-zinc-700 bg-white p-0.5 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <Image size={14} className="text-zinc-600" />
                    </div>
                  )}
                  <span className="text-sm text-white font-semibold truncate flex-1">{p.name}</span>
                  {!p.categoryId && (
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">Rede</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MassEntryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Row[]>([makeRow()]);

  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadRowId, setActiveUploadRowId] = useState<number | null>(null);
  const [rowUploadingIds, setRowUploadingIds] = useState<Record<number, boolean>>({});

  const handleRowClickPhoto = (rowId: number) => {
    setActiveUploadRowId(rowId);
    rowFileInputRef.current?.click();
  };

  const handleRowFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const rowId = activeUploadRowId;
    if (!file || rowId === null) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 5MB.'); return; }
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    setRowUploadingIds(prev => ({ ...prev, [rowId]: true }));
    try {
      const res = await api.post('/products/upload', formDataObj, { headers: { 'Content-Type': 'multipart/form-data' } });
      setRows(r => r.map(cr => cr.id === rowId ? { ...cr, imageUrl: res.data.imageUrl } : cr));
      toast.success('Foto carregada!');
    } catch { toast.error('Erro ao enviar a foto.'); }
    finally { setRowUploadingIds(prev => ({ ...prev, [rowId]: false })); setActiveUploadRowId(null); }
  };

  // ── Catalog & Aux data ───────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<ProductSuggestion[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=2000'),
      api.get('/categories'),
      api.get('/tributacao'),
    ]).then(([prodRes, catRes, grupRes]) => {
      const prods: any[] = prodRes.data.data || [];
      setCatalog(prods.map(p => ({
        id: p.id, name: p.name, imageUrl: p.imageUrl,
        categoryId: p.categoryId, barcode: p.barcode,
        ncm: p.ncm, cest: p.cest, origem: p.origem ?? 0,
        grupoTributacaoId: p.grupoTributacaoId,
      })));
      setCategories(catRes.data);
      setGrupos(grupRes.data);
      if (catRes.data.length > 0 || grupRes.data.length > 0) {
        setRows(prev => prev.map(r => ({
          ...r,
          categoryId: r.categoryId || (catRes.data.length > 0 ? catRes.data[0].id : ''),
          grupoTributacaoId: r.grupoTributacaoId || (grupRes.data.length > 0 ? grupRes.data[0].id : ''),
        })));
      }
    }).catch(() => {}).finally(() => setCatalogLoading(false));
  }, []);

  // ── Row helpers ──────────────────────────────────────────────────────────
  const updateRow = (id: number, field: keyof Row, value: any) =>
    setRows(r => r.map(cr => cr.id === id ? { ...cr, [field]: value } : cr));

  const handleSelectSuggestion = (rowId: number, product: ProductSuggestion) => {
    setRows(r => r.map(cr => cr.id === rowId ? {
      ...cr,
      name: product.name,
      imageUrl: product.imageUrl || '',
      // NOTE: category, fiscal, barcode fields intentionally NOT overwritten
      // so each client keeps their own config per user's instruction
    } : cr));
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows(r => [...r, makeRow({
      categoryId: last?.categoryId || '',
      grupoTributacaoId: last?.grupoTributacaoId || '',
      ncm: last?.ncm || '',
      cest: last?.cest || '',
      origem: last?.origem || 0,
    })]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows(r => r.filter(cr => cr.id !== id));
  };

  // ── Planilha Import ──────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const processRows = (rawRows: unknown[][]) => {
      const validRows = rawRows
        .filter(cols => Array.isArray(cols) && cols.length >= 2)
        .map((cols) => {
          const name = String(cols[0] ?? '').trim();
          const rawPriceVal = cols[1];
          let priceSell: string;
          if (typeof rawPriceVal === 'number') priceSell = rawPriceVal.toString();
          else priceSell = String(rawPriceVal ?? '').trim().replace(',', '.');
          if (!name || priceSell === '' || isNaN(parseFloat(priceSell)) || parseFloat(priceSell) <= 0) return null;
          const catName = String(cols[2] ?? '').trim();
          const stock = String(cols[3] ?? '').trim();
          const barcode = String(cols[4] ?? '').trim();
          const ncm = String(cols[5] ?? '').trim();
          const cest = String(cols[6] ?? '').trim();
          const origemStr = String(cols[7] ?? '0').trim();
          const rawCost = cols[8];
          const priceCost = typeof rawCost === 'number' ? rawCost.toString() : String(rawCost ?? '').replace(',', '.');
          const grupoNome = String(cols[9] ?? '').trim();
          const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          const grupo = grupos.find(g => g.nome.toLowerCase() === grupoNome.toLowerCase());
          return {
            id: Date.now() + Math.random(),
            shortCode: '', barcode, name, priceCost, priceSell,
            stockToAdd: stock, categoryId: cat?.id || (categories[0]?.id || ''),
            grupoTributacaoId: grupo?.id || (grupos[0]?.id || ''),
            ncm, cest, origem: parseInt(origemStr) || 0, imageUrl: '', volumeUnit: '', volumeCapacity: '',
          };
        })
        .filter(Boolean) as Row[];
      if (validRows.length === 0) { toast.warning('Nenhuma linha válida encontrada na planilha.'); return; }
      setRows(validRows);
      toast.success(`${validRows.length} linhas importadas da planilha!`);
    };

    if (isExcel) {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      processRows(data.slice(1));
    } else {
      const text = await file.text();
      const lines = text.split('\n').slice(1);
      const data = lines.map(l => l.split(','));
      processRows(data);
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const validRows = rows
      .filter(r => r.name.trim())
      .map(r => ({
        name: r.name.trim(),
        barcode: r.barcode.trim() || undefined,
        shortCode: r.shortCode.trim() || undefined,
        priceSell: parseFloat(r.priceSell) || 0,
        priceCost: parseFloat(r.priceCost) || 0,
        stockToAdd: parseFloat(r.stockToAdd) || 0,
        categoryId: r.categoryId || undefined,
        grupoTributacaoId: r.grupoTributacaoId || undefined,
        ncm: r.ncm || undefined,
        cest: r.cest || undefined,
        origem: r.origem,
        imageUrl: r.imageUrl || undefined,
        volumeUnit: r.volumeUnit || null,
        volumeCapacity: r.volumeCapacity ? parseFloat(r.volumeCapacity) : null,
      }));
    if (validRows.length === 0) { toast.error('Preencha ao menos uma linha válida com Nome do Produto.'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ processed: number; duplicates: string[]; hasDuplicates: boolean }>('/products/bulk', { items: validRows });
      const { processed, duplicates, hasDuplicates } = res.data;
      if (hasDuplicates) {
        toast.warning(`${processed} produtos cadastrados. Já existentes e ignorados: ${duplicates.join(', ')}`, { duration: 8000 });
      } else {
        toast.success(`${processed} produtos processados e cadastrados no Estoque!`);
      }
      navigate('/dashboard/inventory');
    } catch {
      toast.error('Erro ao enviar lote. Verifique se não há atalhos/códigos de barras conflitantes.');
    } finally { setLoading(false); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-500 w-full max-w-none">
      <input type="file" ref={rowFileInputRef} onChange={handleRowFileChange} accept="image/*" className="hidden" />

      {/* Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-blue-300 font-bold text-sm">Área de Lançamento Rápido de Produtos</p>
          <p className="text-blue-400/70 text-xs mt-0.5">
            Para repor o estoque de produtos já existentes, use a tela <Link to="/dashboard/inventory/stock-entry" className="underline hover:text-blue-300">Entrada de Estoque</Link>.
            Se um produto desta lista já existir por código de barras ou atalho, o estoque será somado automaticamente.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div>
          <Link to="/dashboard/inventory" className="text-zinc-500 hover:text-blue-400 flex items-center gap-2 text-sm font-semibold mb-2 transition-colors">
            <ArrowLeft size={16} /> Voltar ao Catálogo Geral
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Lançamento de Produtos
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase font-bold tracking-widest translate-y-[-2px]">Fast Grid</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Digite o nome do produto — produtos já cadastrados aparecerão como sugestão com imagem.
            O estoque será <strong>somado</strong> para produtos existentes.
          </p>
        </div>

        <div className="flex gap-3">
          {/* Import spreadsheet */}
          <div className="relative group">
            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer border border-zinc-700 text-sm">
              <Upload size={18} />
              <span>Importar Planilha</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            </label>
            {/* Tooltip Excel */}
            <div className="absolute right-full top-0 mr-3 w-[340px] bg-white border border-zinc-300 rounded-xl shadow-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
              <div className="bg-[#217346] px-3 py-2 flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h16v16H2z" fill="none"/><path d="M11 2v7h7V2h-7zm0 9v7h7v-7h-7zM2 2v7h7V2H2zm0 9v7h7v-7H2z" fill="white" opacity=".3"/><text x="3" y="14" fontSize="10" fontWeight="bold" fill="white">XLS</text></svg>
                <span className="text-white text-xs font-bold">Formato da Planilha</span>
              </div>
              <table className="w-full border-collapse text-xs" style={{fontFamily: 'Calibri, Arial, sans-serif'}}>
                <thead>
                  <tr>
                    <th className="w-8 bg-[#f2f2f2] border border-[#d0d0d0] text-[#666] text-center py-1"></th>
                    <th className="bg-[#f2f2f2] border border-[#d0d0d0] text-[#444] text-center py-1 font-bold w-1/2">A</th>
                    <th className="bg-[#f2f2f2] border border-[#d0d0d0] text-[#444] text-center py-1 font-bold w-1/2">B</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['1', 'Nome do Produto', 'Preço', true],
                    ['2', 'Coca-Cola 2L', '12.00', false],
                    ['3', 'Heineken 350ml', '7.50', false],
                  ].map(([num, colA, colB, isHeader]) => (
                    <tr key={String(num)} className={isHeader as any ? 'bg-[#e2efda]' : 'bg-white hover:bg-[#f5f5f5]'}>
                      <td className="bg-[#f2f2f2] border border-[#d0d0d0] text-[#888] text-center py-1 px-1 font-bold">{num}</td>
                      <td className={`border border-[#d0d0d0] px-2 py-1 ${isHeader ? 'font-bold text-[#1f6a35]' : 'text-[#222]'}`}>{colA}</td>
                      <td className={`border border-[#d0d0d0] px-2 py-1 text-right ${isHeader ? 'font-bold text-[#1f6a35]' : 'text-[#222]'}`}>{colB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-snug">
                  <strong>Apenas colunas A (Nome) e B (Preço) são obrigatórias.</strong><br />
                  Aceita <strong>.xlsx</strong> e <strong>.csv</strong> diretamente.
                </p>
              </div>
            </div>
          </div>

          {/* Link to mass edit */}
          <Link
            to="/dashboard/inventory/mass-edit"
            className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 text-purple-400 px-3 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Edição em Massa</span>
            <span className="sm:hidden">Editar</span>
          </Link>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-sm lg:text-base"
          >
            {loading ? <Save className="animate-spin" size={18} /> : <Send size={18} />}
            <span className="hidden sm:inline">Processar Tabela</span>
            <span className="sm:hidden">Processar</span>
          </button>
        </div>
      </div>

      {/* ─── Desktop Grid (hidden on mobile) ─────────────────────────────── */}
      <div className="hidden lg:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl w-full">
        <div className="overflow-x-auto relative w-full">
          <table className="w-full text-left min-w-0 table-fixed">
            <thead className="bg-zinc-950 text-zinc-400 text-xs shadow-md relative z-10">
              <tr>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-center w-[40px]">#</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-center w-[60px]">Foto</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[18%]">Nome da Mercadoria</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-center w-[140px]">Fracionado</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">Venda (R$)</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[11%]">Categoria</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">Estoque</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[130px]">Cód. Barras</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">NCM</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">CEST</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[120px]">Origem</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">Custo (R$)</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[11%]">Grupo Fiscal</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-left w-[90px]">Cód. Curto</th>
                <th className="px-3 py-3 font-bold uppercase tracking-widest text-center w-[60px]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-3 py-2 text-center text-zinc-600 font-bold text-sm w-[40px]">{index + 1}</td>

                  <td className="px-3 py-2 w-[60px]">
                    <div className="flex justify-center relative group">
                      {rowUploadingIds[row.id] ? (
                        <div className="w-10 h-10 shrink-0 bg-zinc-950/80 rounded-lg flex items-center justify-center border border-zinc-800/50 text-blue-500">
                          <Loader2 className="animate-spin" size={16} />
                        </div>
                      ) : row.imageUrl ? (
                        <div className="w-10 h-10 shrink-0 bg-white rounded-lg flex items-center justify-center p-1 shadow-md border border-zinc-800/60 relative animate-in fade-in zoom-in duration-300">
                          <img src={row.imageUrl} alt="" className="w-full h-full object-contain cursor-pointer" onClick={() => handleRowClickPhoto(row.id)} />
                          <button type="button" onClick={() => setRows(r => r.map(cr => cr.id === row.id ? { ...cr, imageUrl: '' } : cr))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md">
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div onClick={() => handleRowClickPhoto(row.id)} className="w-10 h-10 shrink-0 bg-zinc-950/80 hover:bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800/50 hover:border-blue-500/50 text-zinc-700 hover:text-zinc-400 cursor-pointer transition-all duration-200">
                          <Image size={18} />
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 w-[18%]">
                    <NameAutocomplete value={row.name} onChange={v => updateRow(row.id, 'name', v)} onSelect={p => handleSelectSuggestion(row.id, p)} suggestions={catalog} loading={catalogLoading} />
                  </td>

                  <td className="px-3 py-2 text-center w-[140px]">
                    <div className="flex gap-1.5 items-center justify-center">
                      <select value={row.volumeUnit || ''} onChange={e => { const val = e.target.value; setRows(r => r.map(cr => cr.id === row.id ? { ...cr, volumeUnit: val, volumeCapacity: val ? cr.volumeCapacity || '' : '' } : cr)); }}
                        className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors select-none w-full">
                        <option value="">Não</option>
                        <option value="ML">ML</option>
                        <option value="UN">UN</option>
                      </select>
                      {(row.volumeUnit === 'ML' || row.volumeUnit === 'UN') && (
                        <input type="number" placeholder={row.volumeUnit === 'ML' ? 'ml' : 'un'} value={row.volumeCapacity} onChange={e => updateRow(row.id, 'volumeCapacity', e.target.value)}
                          className="w-16 bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors" />
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="number" step="0.01" placeholder="0.00" value={row.priceSell} onChange={e => updateRow(row.id, 'priceSell', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[11%]">
                    <select value={row.categoryId} onChange={e => updateRow(row.id, 'categoryId', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors select-none">
                      <option value="" disabled>Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="number" placeholder="Qtd" value={row.stockToAdd} onChange={e => updateRow(row.id, 'stockToAdd', e.target.value)}
                      className="w-full bg-zinc-950 flex border-2 border-zinc-800 rounded-lg px-3 py-2 text-sm text-blue-400 font-black focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[130px]">
                    <input type="text" placeholder="Código Barras" value={row.barcode} onChange={e => updateRow(row.id, 'barcode', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="text" placeholder="NCM" maxLength={8} value={row.ncm} onChange={e => updateRow(row.id, 'ncm', e.target.value)}
                      className="w-full bg-indigo-950/20 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="text" placeholder="CEST" maxLength={7} value={row.cest} onChange={e => updateRow(row.id, 'cest', e.target.value)}
                      className="w-full bg-indigo-950/20 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[120px]">
                    <select value={row.origem} onChange={e => updateRow(row.id, 'origem', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors select-none">
                      <option value={0}>0-Nac</option>
                      <option value={1}>1-Imp</option>
                      <option value={2}>2-Imp</option>
                    </select>
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="number" step="0.01" placeholder="0.00" value={row.priceCost} onChange={e => updateRow(row.id, 'priceCost', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 w-[11%]">
                    <select value={row.grupoTributacaoId} onChange={e => updateRow(row.id, 'grupoTributacaoId', e.target.value)}
                      className="w-full bg-indigo-950/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors select-none">
                      <option value="">— Sem Fiscal —</option>
                      {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </td>

                  <td className="px-3 py-2 w-[90px]">
                    <input type="text" placeholder="Auto" value={row.shortCode} onChange={e => updateRow(row.id, 'shortCode', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Tab' && index === rows.length - 1) { e.preventDefault(); addRow(); } }}
                      className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-yellow-500/50 font-mono focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors" />
                  </td>

                  <td className="px-3 py-2 text-center w-[60px]">
                    <button onClick={() => removeRow(row.id)} disabled={rows.length === 1} tabIndex={-1}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900/50 hover:bg-blue-600/10 text-zinc-400 hover:text-blue-400 font-bold border-t border-dashed border-zinc-800 transition-colors outline-none">
            <Plus size={18} /> Adicionar Linha (Pressione Tab no último campo)
          </button>
        </div>
      </div>

      {/* ─── Mobile Cards (hidden on desktop) ──────────────────────────────── */}
      <div className="lg:hidden space-y-3 pb-28">
        {rows.map((row, index) => (
          <div key={row.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-md">
            {/* Card Header: Photo + Name + Remove */}
            <div className="flex items-center gap-3 px-3 pt-3 pb-2 border-b border-zinc-800/80">
              <div className="shrink-0 relative">
                {rowUploadingIds[row.id] ? (
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 text-blue-400">
                    <Loader2 className="animate-spin" size={18} />
                  </div>
                ) : row.imageUrl ? (
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-1 border border-zinc-700 shadow-sm relative">
                    <img src={row.imageUrl} alt="" className="w-full h-full object-contain" onClick={() => handleRowClickPhoto(row.id)} />
                    <button type="button" onClick={() => setRows(r => r.map(cr => cr.id === row.id ? { ...cr, imageUrl: '' } : cr))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white shadow-md">
                      <X size={9} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => handleRowClickPhoto(row.id)} className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 hover:border-blue-500 text-zinc-600 hover:text-blue-400 cursor-pointer transition-all">
                    <Image size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <NameAutocomplete value={row.name} onChange={v => updateRow(row.id, 'name', v)} onSelect={p => handleSelectSuggestion(row.id, p)} suggestions={catalog} loading={catalogLoading} />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-zinc-600 font-bold w-4 text-center">{index + 1}</span>
                <button onClick={() => removeRow(row.id)} disabled={rows.length === 1}
                  className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Fields: 3 columns for key data */}
            <div className="px-3 pt-2 pb-2 grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Venda R$</label>
                <input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={row.priceSell} onChange={e => updateRow(row.id, 'priceSell', e.target.value)}
                  className="w-full text-center bg-zinc-950 border border-emerald-500/30 rounded-lg px-1 py-2.5 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-400 transition-colors" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Estoque</label>
                <input type="number" inputMode="decimal" placeholder="Qtd" value={row.stockToAdd} onChange={e => updateRow(row.id, 'stockToAdd', e.target.value)}
                  className="w-full text-center bg-zinc-950 border border-blue-500/30 rounded-lg px-1 py-2.5 text-sm text-blue-400 font-black focus:outline-none focus:border-blue-400 transition-colors" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block mb-1">Custo R$</label>
                <input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={row.priceCost} onChange={e => updateRow(row.id, 'priceCost', e.target.value)}
                  className="w-full text-center bg-zinc-950 border border-rose-500/30 rounded-lg px-1 py-2.5 text-sm text-rose-400 font-bold focus:outline-none focus:border-rose-400 transition-colors" />
              </div>
            </div>

            {/* Categoria */}
            <div className="px-3 pb-2">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Categoria</label>
              <select value={row.categoryId} onChange={e => updateRow(row.id, 'categoryId', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors">
                <option value="" disabled>Selecione...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Extra fields toggle (barcode, fiscal etc) */}
            <details className="group">
              <summary className="px-3 pb-2 text-[10px] text-zinc-600 hover:text-zinc-400 font-semibold cursor-pointer select-none list-none flex items-center gap-1 transition-colors">
                <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                Dados Fiscais / Avançados
              </summary>
              <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-zinc-800/60 pt-2">
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Cód. Barras</label>
                  <input type="text" placeholder="EAN" value={row.barcode} onChange={e => updateRow(row.id, 'barcode', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Cód. Curto</label>
                  <input type="text" placeholder="Auto" value={row.shortCode} onChange={e => updateRow(row.id, 'shortCode', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-yellow-500/60 font-mono focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">NCM</label>
                  <input type="text" placeholder="NCM" maxLength={8} value={row.ncm} onChange={e => updateRow(row.id, 'ncm', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">CEST</label>
                  <input type="text" placeholder="CEST" maxLength={7} value={row.cest} onChange={e => updateRow(row.id, 'cest', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Origem</label>
                  <select value={row.origem} onChange={e => updateRow(row.id, 'origem', parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors">
                    <option value={0}>0-Nacional</option>
                    <option value={1}>1-Importado</option>
                    <option value={2}>2-Importado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Grupo Fiscal</label>
                  <select value={row.grupoTributacaoId} onChange={e => updateRow(row.id, 'grupoTributacaoId', e.target.value)}
                    className="w-full bg-zinc-950 border border-indigo-500/20 rounded-lg px-2 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 transition-colors">
                    <option value="">— Sem Fiscal —</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Fracionado</label>
                  <div className="flex gap-2 items-center">
                    <select value={row.volumeUnit || ''} onChange={e => { const val = e.target.value; setRows(r => r.map(cr => cr.id === row.id ? { ...cr, volumeUnit: val, volumeCapacity: val ? cr.volumeCapacity || '' : '' } : cr)); }}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors">
                      <option value="">Não</option>
                      <option value="ML">ML</option>
                      <option value="UN">UN</option>
                    </select>
                    {(row.volumeUnit === 'ML' || row.volumeUnit === 'UN') && (
                      <input type="number" placeholder={row.volumeUnit === 'ML' ? 'ml' : 'un'} value={row.volumeCapacity} onChange={e => updateRow(row.id, 'volumeCapacity', e.target.value)}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-indigo-400 font-bold focus:outline-none focus:border-indigo-500 transition-colors" />
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
        ))}

        <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-4 bg-zinc-900/60 hover:bg-blue-600/10 text-zinc-500 hover:text-blue-400 font-bold border border-dashed border-zinc-800 hover:border-blue-500/40 rounded-2xl transition-all">
          <Plus size={18} /> Adicionar Produto
        </button>
      </div>

      {/* Mobile floating process button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-50">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xl active:scale-95 text-base disabled:opacity-50">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Processar {rows.filter(r => r.name.trim()).length} Produto(s)
        </button>
      </div>
    </div>
  );
}
