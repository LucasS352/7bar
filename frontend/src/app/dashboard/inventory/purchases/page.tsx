"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, ArrowLeft, Send, Upload, AlertTriangle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function MassEntryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [rows, setRows] = useState([
    { id: Date.now(), shortCode: '', barcode: '', name: '', priceCost: '', priceSell: '', stockToAdd: '', categoryId: '', grupoTributacaoId: '', ncm: '', cest: '', origem: 0 }
  ]);
  
  // Cache de Produtos e Auxiliares
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/categories'),
      api.get('/tributacao')
    ]).then(([prodRes, catRes, grupRes]) => {
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setGrupos(grupRes.data);
      
      // Se tiver categorias e grupos, pré-seleciona na primeira linha vazia
      if (catRes.data.length > 0 || grupRes.data.length > 0) {
         setRows(prev => prev.map(r => ({
            ...r,
            categoryId: catRes.data.length > 0 ? catRes.data[0].id : '',
            grupoTributacaoId: grupRes.data.length > 0 ? grupRes.data[0].id : ''
         })));
      }
    }).catch(() => {});
  }, []);

  const addRow = () => {
    // Clona as configurações da linha anterior para agilizar o lançamento
    const lastRow = rows[rows.length - 1];
    setRows([...rows, { 
      id: Date.now(), shortCode: '', barcode: '', name: '', priceCost: '', priceSell: '', stockToAdd: '', 
      categoryId: lastRow?.categoryId || '', 
      grupoTributacaoId: lastRow?.grupoTributacaoId || '',
      ncm: lastRow?.ncm || '',
      cest: lastRow?.cest || '',
      origem: lastRow?.origem || 0
    }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const processRows = (rawRows: unknown[][]) => {
      const validRows = rawRows
        .filter(cols => Array.isArray(cols) && cols.length >= 2)
        .map((cols, index) => {
          // SheetJS retorna números como JS number, não string
          const name = String(cols[0] ?? '').trim();

          // Preço pode vir como number (xlsx) ou string (csv) — trata os dois casos
          const rawPriceVal = cols[1];
          let priceSell: string;
          if (typeof rawPriceVal === 'number') {
            priceSell = rawPriceVal.toString();
          } else {
            priceSell = String(rawPriceVal ?? '').trim().replace(',', '.');
          }

          // Validação: nome obrigatório + preço numérico válido (> 0)
          if (!name || priceSell === '' || isNaN(parseFloat(priceSell)) || parseFloat(priceSell) <= 0) return null;

          const catName   = String(cols[2]  ?? '').trim();
          const stock     = String(cols[3]  ?? '').trim();
          const barcode   = String(cols[4]  ?? '').trim();
          const ncm       = String(cols[5]  ?? '').trim();
          const cest      = String(cols[6]  ?? '').trim();
          const origemStr = String(cols[7]  ?? '0').trim();
          const rawCost   = cols[8];
          const priceCost = typeof rawCost === 'number'
            ? rawCost.toString()
            : String(rawCost ?? '').replace(',', '.');
          const grupoNome = String(cols[9]  ?? '').trim();

          const matchedCat   = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          const matchedGrupo = grupos.find(g => g.nome.toLowerCase() === grupoNome.toLowerCase());

          return {
            id: Date.now() + index,
            shortCode: '',
            barcode,
            name,
            priceCost,
            priceSell,
            stockToAdd: stock,
            categoryId:        matchedCat   ? matchedCat.id   : (categories.length > 0 ? categories[0].id : ''),
            grupoTributacaoId: matchedGrupo ? matchedGrupo.id : (grupos.length > 0 ? grupos[0].id : ''),
            ncm,
            cest,
            origem: parseInt(origemStr) || 0,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (validRows.length > 0) {
        setRows(validRows);
        toast.success(`${validRows.length} produto${validRows.length > 1 ? 's' : ''} carregado${validRows.length > 1 ? 's' : ''} da planilha!`);
      } else {
        toast.error('Nenhum dado válido. Verifique: Coluna A = Nome (texto), Coluna B = Preço (número > 0).');
      }
    };

    if (isExcel) {
      // ── Leitura de .xlsx / .xls via SheetJS (import dinâmico) ──────────
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const XLSX = await import('xlsx');
          const data     = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet    = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows  = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
          const nonEmpty = rawRows.filter(r => (r as unknown[]).some(c => String(c).trim() !== ''));
          processRows(nonEmpty as unknown[][]);
        } catch {
          toast.error('Falha ao ler o arquivo Excel. Verifique se está corrompido.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // ── Leitura de .csv — tenta Latin-1 e depois UTF-8 ─────
      const parseCSV = (text: string): unknown[][] => {
        text = text.replace(/^\uFEFF/, ''); // Remove BOM
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return [];
        const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
        return lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
      };

      const readerLatin = new FileReader();
      readerLatin.onload = (evt) => {
        try {
          const rows = parseCSV(evt.target?.result as string);
          if (rows.length === 0) {
            const readerUtf = new FileReader();
            readerUtf.onload = (e2) => {
              try { processRows(parseCSV(e2.target?.result as string)); }
              catch { toast.error('Falha ao ler o CSV.'); }
            };
            readerUtf.readAsText(file, 'utf-8');
          } else {
            processRows(rows);
          }
        } catch {
          toast.error('Falha ao ler o arquivo. Salve novamente como CSV no Excel.');
        }
      };
      readerLatin.readAsText(file, 'windows-1252');
    }
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => {

      if (r.id !== id) return r;
      
      const updated = { ...r, [field]: value };
      
      // Auto-preenchimento Inteligente
      if (field === 'shortCode' || field === 'barcode') {
         const match = products.find(p => 
           (field === 'shortCode' && value && p.shortCode === value) || 
           (field === 'barcode' && value && p.barcode === value)
         );
         if (match) {
            updated.name = match.name;
            updated.priceCost = match.priceCost?.toString() || '0';
            updated.priceSell = match.priceSell?.toString() || '0';
            if (field === 'shortCode') updated.barcode = match.barcode || '';
            if (field === 'barcode') updated.shortCode = match.shortCode || '';
         }
      }
      return updated;
    }));
  };

  async function handleSubmit() {
    const validRows = rows.filter(r => r.name.trim().length > 0).map(r => ({
      shortCode:         r.shortCode || null,
      barcode:           r.barcode   || null,
      name:              r.name,
      priceCost:         parseFloat(r.priceCost)  || 0,
      priceSell:         parseFloat(r.priceSell)  || 0,
      stockToAdd:        parseInt(r.stockToAdd)   || 0,
      categoryId:        r.categoryId             || undefined,
      grupoTributacaoId: r.grupoTributacaoId      || undefined,
      ncm:               r.ncm                   || undefined,
      cest:              r.cest                  || undefined,
      origem:            r.origem,
    }));

    if (validRows.length === 0) {
      toast.error('Preencha ao menos uma linha válida com Nome do Produto.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ processed: number; duplicates: string[]; hasDuplicates: boolean }>('/products/bulk', { items: validRows });
      const { processed, duplicates, hasDuplicates } = res.data;
      if (hasDuplicates) {
        toast.warning(
          `${processed} produtos cadastrados. Os seguintes nomes já existem e foram ignorados: ${duplicates.join(', ')}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`${processed} produtos processados e computados no Estoque!`);
      }
      navigate('/dashboard/inventory');
    } catch {
      toast.error('Erro ao enviar lote. Verifique se não há atalhos/códigos de barras conflitantes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px]">

      {/* Banner: Área exclusiva para NOVOS produtos */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info size={20} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-blue-300 font-bold text-sm">Área exclusiva para cadastro de NOVOS produtos</p>
          <p className="text-blue-400/70 text-xs mt-0.5">
            Para repor o estoque de produtos já existentes, use a tela <Link to="/dashboard/inventory/stock-entry" className="underline hover:text-blue-300">Entrada de Estoque</Link>.
            Se um produto desta lista já existir por código de barras ou atalho, o estoque será somado automaticamente.
          </p>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div>
          <Link to="/dashboard/inventory" className="text-zinc-500 hover:text-blue-400 flex items-center gap-2 text-sm font-semibold mb-2 transition-colors">
            <ArrowLeft size={16} /> Voltar ao Catálogo Geral
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
             Entrada de Compras em Massa <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase font-bold tracking-widest translate-y-[-2px]">Fast Grid</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Insira vários produtos em lote. Se o código curto ou código de barras já existir, os valores serão atualizados e o estoque será <strong>somado</strong>.</p>
        </div>
        
        <div className="flex gap-3">
          {/* Botão de importação com tooltip */}
          <div className="relative group">
            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer border border-zinc-700 text-sm">
              <Upload size={18} />
              <span>Importar Planilha</span>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            </label>
            {/* Tooltip visual — simula grade do Excel, abre para a ESQUERDA */}
            <div className="absolute right-full top-0 mr-3 w-[340px] bg-white border border-zinc-300 rounded-xl shadow-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
              {/* Título */}
              <div className="bg-[#217346] px-3 py-2 flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h16v16H2z" fill="none"/><path d="M11 2v7h7V2h-7zm0 9v7h7v-7h-7zM2 2v7h7V2H2zm0 9v7h7v-7H2z" fill="white" opacity=".3"/><text x="3" y="14" fontSize="10" fontWeight="bold" fill="white">XLS</text></svg>
                <span className="text-white text-xs font-bold">Formato da Planilha</span>
              </div>
              {/* Grade estilo Excel */}
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
                    ['2', 'Cerveja Heineken 330ml', '6.50', false],
                    ['3', 'Carvão Saco 3kg', '15.00', false],
                  ].map(([num, colA, colB, isHeader]) => (
                    <tr key={String(num)} className={isHeader ? 'bg-[#e2efda]' : 'bg-white hover:bg-[#f5f5f5]'}>
                      <td className="bg-[#f2f2f2] border border-[#d0d0d0] text-[#888] text-center py-1 px-1 font-bold">{num}</td>
                      <td className={`border border-[#d0d0d0] px-2 py-1 ${isHeader ? 'font-bold text-[#1f6a35]' : 'text-[#222]'}`}>{colA}</td>
                      <td className={`border border-[#d0d0d0] px-2 py-1 text-right ${isHeader ? 'font-bold text-[#1f6a35]' : 'text-[#222]'}`}>{colB}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Aviso */}
              <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-snug">
                  <strong>Apenas colunas A (Nome) e B (Preço) são obrigatórias.</strong><br />
                  Aceita <strong>.xlsx</strong> e <strong>.csv</strong> diretamente.
                </p>
              </div>
            </div>

          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-lg"
          >
            {loading ? <Save className="animate-spin" /> : <Send />}
            Processar Tabela
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-zinc-950 text-zinc-400 text-xs shadow-md relative z-10">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-12 text-center">#</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left">Nome da Mercadoria</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Venda (R$)</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-32">Categoria</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Estoque</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-32">Cód. Barras</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">NCM</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">CEST</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Origem</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Custo (R$)</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-40">Grupo Fiscal</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Cód. Curto</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-2 text-center text-zinc-600 font-bold text-sm">{index + 1}</td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Nome do Produto"
                      value={row.name}
                      onChange={e => updateRow(row.id, 'name', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={row.priceSell}
                      onChange={e => updateRow(row.id, 'priceSell', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.categoryId}
                      onChange={e => updateRow(row.id, 'categoryId', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    >
                      <option value="" disabled>Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number"
                      placeholder="Qtd Fardo"
                      value={row.stockToAdd}
                      onChange={e => updateRow(row.id, 'stockToAdd', e.target.value)}
                      className="w-full bg-zinc-950 flex border-2 border-zinc-800 rounded-lg px-3 py-2 text-sm text-blue-400 font-black focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="EAN"
                      value={row.barcode}
                      onChange={e => updateRow(row.id, 'barcode', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="NCM"
                      maxLength={8}
                      value={row.ncm}
                      onChange={e => updateRow(row.id, 'ncm', e.target.value)}
                      className="w-full bg-indigo-950/20 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="CEST"
                      maxLength={7}
                      value={row.cest}
                      onChange={e => updateRow(row.id, 'cest', e.target.value)}
                      className="w-full bg-indigo-950/20 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.origem}
                      onChange={e => updateRow(row.id, 'origem', parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    >
                      <option value={0}>0-Nac</option>
                      <option value={1}>1-Imp</option>
                      <option value={2}>2-Imp</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={row.priceCost}
                      onChange={e => updateRow(row.id, 'priceCost', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.grupoTributacaoId}
                      onChange={e => updateRow(row.id, 'grupoTributacaoId', e.target.value)}
                      className="w-full bg-indigo-950/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 focus:bg-zinc-900 transition-colors"
                    >
                      <option value="">— Sem Fiscal —</option>
                      {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Auto"
                      title="Deixe em branco para auto-gerar"
                      value={row.shortCode}
                      onChange={e => updateRow(row.id, 'shortCode', e.target.value)}
                      onKeyDown={e => {
                         if (e.key === 'Tab' && index === rows.length - 1) {
                            e.preventDefault();
                            addRow();
                         }
                      }}
                      className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-yellow-500/50 font-mono focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      tabIndex={-1}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900/50 hover:bg-blue-600/10 text-zinc-400 hover:text-blue-400 font-bold border-t border-dashed border-zinc-800 transition-colors outline-none"
          >
            <Plus size={18} /> Adicionar Linha (Pressione Tab no último campo)
          </button>
        </div>
      </div>
    </div>
  );
}
