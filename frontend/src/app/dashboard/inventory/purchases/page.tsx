"use client";
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MassEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Grade inicial vazia
  const [rows, setRows] = useState([
    { id: Date.now(), shortCode: '', barcode: '', name: '', priceCost: '', priceSell: '', stockToAdd: '' }
  ]);
  
  // Cache de Produtos
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(() => {});
  }, []);

  const addRow = () => {
    setRows([...rows, { id: Date.now(), shortCode: '', barcode: '', name: '', priceCost: '', priceSell: '', stockToAdd: '' }]);
  };

  const removeRow = (id: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter(r => r.id !== id));
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

  const handleSubmit = async () => {
    // Filtrar linhas validas minimamente (Tem nome)
    const validRows = rows.filter(r => r.name.trim().length > 0).map(r => ({
       shortCode: r.shortCode || null,
       barcode: r.barcode || null,
       name: r.name,
       priceCost: parseFloat(r.priceCost) || 0,
       priceSell: parseFloat(r.priceSell) || 0,
       stockToAdd: parseInt(r.stockToAdd) || 0,
    }));

    if (validRows.length === 0) {
      toast.error('Preencha ao menos uma linha válida com Nome do Produto.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/products/bulk', { items: validRows });
      toast.success(`${res.data.processed} produtos processados e computados no Estoque!`);
      router.push('/dashboard/inventory'); // Volta pra pagina de inventario
    } catch (err) {
       toast.error('Erro ao enviar lote. Verifique se não há atalhos/códigos de barras conflitantes.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px]">
      
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <div>
          <Link href="/dashboard/inventory" className="text-zinc-500 hover:text-blue-400 flex items-center gap-2 text-sm font-semibold mb-2 transition-colors">
            <ArrowLeft size={16} /> Voltar ao Catálogo Geral
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
             Entrada de Compras em Massa <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 uppercase font-bold tracking-widest translate-y-[-2px]">Fast Grid</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Insira vários produtos em lote. Se o código curto ou código de barras já existir, os valores serão atualizados e o estoque será <strong>somado</strong>.</p>
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-zinc-950 text-zinc-400 text-xs shadow-md relative z-10">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-12 text-center">#</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-24">Cód. Curto</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-48">Cód. Barras</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left">Nome da Mercadoria</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-32">Custo Unit. (R$)</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-32">Venda (R$)</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest text-left w-32">Estoque Entrando</th>
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
                      placeholder="Auto"
                      title="Deixe em branco para auto-gerar"
                      value={row.shortCode}
                      onChange={e => updateRow(row.id, 'shortCode', e.target.value)}
                      className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-yellow-500/50 font-mono focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      autoFocus={index === rows.length - 1}
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
                      placeholder="Nome do Produto (Obrigatório)"
                      value={row.name}
                      onChange={e => updateRow(row.id, 'name', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
                    />
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
                    <input 
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={row.priceSell}
                      onChange={e => updateRow(row.id, 'priceSell', e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-emerald-400 font-black focus:outline-none focus:border-emerald-500 focus:bg-zinc-900 transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number"
                      placeholder="Qtd Fardo"
                      value={row.stockToAdd}
                      onChange={e => updateRow(row.id, 'stockToAdd', e.target.value)}
                      onKeyDown={e => {
                         if (e.key === 'Tab' && index === rows.length - 1) {
                            e.preventDefault();
                            addRow();
                         }
                      }}
                      className="w-full bg-zinc-950 flex border-2 border-zinc-800 rounded-lg px-3 py-2 text-sm text-blue-400 font-black focus:outline-none focus:border-blue-500 focus:bg-zinc-900 transition-colors"
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
