"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ExportXmlModal } from '@/components/ExportXmlModal';
import { DollarSign, TrendingUp, Package, Loader2, CheckCircle2, XCircle, Clock, Receipt, Download } from 'lucide-react';
import { toast } from 'sonner';

type SaleItem = {
  id: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product: { name: string };
};

type Payment = {
  method: string;
  value: number;
};

type Sale = {
  id: string;
  total: number;
  createdAt: string;
  items: SaleItem[];
  payments: Payment[];
  emitirNfce: boolean;
  nfceStatus: string | null;
  nfceNumero: number | null;
};

export default function SalesDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fetchSales = () => {
    api.get('/sales')
      .then(res => setSales(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleEmitNfce = async (saleId: string) => {
    setEmittingId(saleId);
    try {
      await api.post(`/sales/${saleId}/emit-nfce`);
      toast.success('Emissão solicitada com sucesso!');
      fetchSales();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Erro ao emitir NFC-e';
      toast.error(msg);
    } finally {
      setEmittingId(null);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
  const totalItemsSold = sales.reduce((acc, sale) => acc + sale.items.reduce((sum, item) => sum + Number(item.quantity), 0), 0);

  const totalPix = sales.reduce((acc, sale) => acc + sale.payments.filter(p => p.method === 'pix').reduce((s, p) => s + Number(p.value), 0), 0);
  const totalDinheiro = sales.reduce((acc, sale) => acc + sale.payments.filter(p => p.method === 'dinheiro').reduce((s, p) => s + Number(p.value), 0), 0);
  const totalCredito = sales.reduce((acc, sale) => acc + sale.payments.filter(p => p.method === 'credito').reduce((s, p) => s + Number(p.value), 0), 0);
  const totalDebito = sales.reduce((acc, sale) => acc + sale.payments.filter(p => p.method === 'debito').reduce((s, p) => s + Number(p.value), 0), 0);

  // Analytics
  const productsCount: Record<string, {name: string, qty: number, rev: number}> = {};
  const hourlyCount: Record<number, number> = {};

  sales.forEach(sale => {
    const hour = new Date(sale.createdAt).getHours();
    hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;

    sale.items.forEach(item => {
      const pName = item.product?.name || 'Desconhecido';
      if (!productsCount[pName]) productsCount[pName] = { name: pName, qty: 0, rev: 0 };
      productsCount[pName].qty += Number(item.quantity);
      productsCount[pName].rev += (Number(item.quantity) * Number(item.priceUnit));
    });
  });

  const topProducts = Object.values(productsCount).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const peakHour = Object.entries(hourlyCount).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Resumo de Vendas</h1>
        <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl transition-colors font-medium border border-zinc-700 hover:border-zinc-600">
          <Download size={18} /> Exportar para Contador
        </button>
      </div>
      
      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-emerald-500/50 transition-colors">
          <div>
            <p className="text-zinc-400 font-medium">Faturamento Bruto</p>
            <p className="text-3xl font-black text-white mt-2">R$ {totalRevenue.toFixed(2)}</p>
          </div>
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign size={28} /></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 transition-colors">
          <div>
            <p className="text-zinc-400 font-medium">Pedidos Realizados</p>
            <p className="text-3xl font-black text-white mt-2">{sales.length}</p>
          </div>
          <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><TrendingUp size={28} /></div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-purple-500/50 transition-colors">
          <div>
            <p className="text-zinc-400 font-medium">Produtos Vendidos</p>
            <p className="text-3xl font-black text-white mt-2">{totalItemsSold}</p>
          </div>
          <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Package size={28} /></div>
        </div>
      </div>

      {/* Resumo por Forma de Pagamento */}
      <div className="mt-10 mb-4">
        <h2 className="text-xl font-bold tracking-tight">Fluxo de Caixa (Recebimentos)</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-4 border-l-emerald-500 shadow-md hover:-translate-y-1 transition-transform">
          <p className="text-zinc-400 text-sm font-medium mb-1">Dinheiro em Caixa</p>
          <p className="text-2xl font-black text-emerald-400">R$ {totalDinheiro.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-4 border-l-teal-500 shadow-md hover:-translate-y-1 transition-transform">
          <p className="text-zinc-400 text-sm font-medium mb-1">Transferências (Pix)</p>
          <p className="text-2xl font-black text-teal-400">R$ {totalPix.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-4 border-l-indigo-500 shadow-md hover:-translate-y-1 transition-transform">
          <p className="text-zinc-400 text-sm font-medium mb-1">Cartão de Crédito</p>
          <p className="text-2xl font-black text-indigo-400">R$ {totalCredito.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl border-l-4 border-l-sky-500 shadow-md hover:-translate-y-1 transition-transform">
          <p className="text-zinc-400 text-sm font-medium mb-1">Cartão de Débito</p>
          <p className="text-2xl font-black text-sky-400">R$ {totalDebito.toFixed(2)}</p>
        </div>
      </div>

      {/* Analytics */}
      <h2 className="text-xl font-bold tracking-tight mb-4">Inteligência de Vendas (Analytics)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-zinc-400 font-medium mb-6 flex items-center gap-2"><Package size={18}/> Produtos com Maior Saída (Top 5)</h3>
          <div className="space-y-4">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm group">
                <div className="flex items-center gap-4">
                  <span className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">{idx + 1}</span>
                  <span className="font-semibold text-white text-base">{p.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-md">{p.qty} un</span>
                  <span className="text-emerald-400 font-bold w-24 text-right tracking-wide">R$ {p.rev.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-zinc-500 text-sm italic">Nenhum dado suficiente.</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]"></div>
          <h3 className="text-zinc-400 font-medium mb-2 relative z-10 flex items-center gap-2">Horário de Pico (Mais Vendas)</h3>
          {peakHour ? (
            <div className="relative z-10 mt-6">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-4 drop-shadow-sm">{peakHour[0]}h00</div>
              <p className="text-zinc-400">Foram registradas <strong className="text-white text-lg">{peakHour[1]}</strong> vendas nesta faixa de horário histórico.</p>
              <p className="text-xs text-zinc-500 mt-4 border border-zinc-800 inline-block px-3 py-1 rounded-full">Baseado em volume de transações</p>
            </div>
          ) : (
             <p className="text-zinc-500 text-sm mt-4">Ainda sem histórico de horários.</p>
          )}
        </div>

      </div>

      {/* Relatório Detalhado */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-8 shadow-xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold">Histórico de Transações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Data/Hora</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Itens do Pedido</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Método Pgto</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">NFC-e</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {sales.map(sale => (
                <tr key={sale.id} className="hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap text-zinc-300">
                    {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(sale.createdAt))}
                  </td>
                  <td className="px-6 py-5">
                    <ul className="text-sm space-y-1.5">
                      {sale.items.map(i => (
                        <li key={i.id} className="flex items-center gap-2">
                          <span className="bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.5 rounded text-xs">
                            {i.quantity}x
                          </span> 
                          <span className="text-zinc-300">{i.product?.name || 'Desconhecido'}</span>
                          <span className="text-zinc-500 text-xs">- R$ {(Number(i.priceUnit) * Number(i.quantity)).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-5">
                    {sale.payments.map((p, idx) => (
                      <span key={idx} className="inline-block bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded text-xs uppercase font-bold mr-2 text-zinc-300">
                        {p.method}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-5 align-middle text-center">
                    {sale.emitirNfce ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        {sale.nfceStatus === 'autorizada' ? (
                          <span className="text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 whitespace-nowrap">
                            <CheckCircle2 size={12}/> {sale.nfceNumero ? `Nº ${sale.nfceNumero}` : 'Autorizada'}
                          </span>
                        ) : sale.nfceStatus === 'rejeitada' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-semibold text-xs flex items-center justify-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 whitespace-nowrap">
                              <XCircle size={12}/> Rejeitada
                            </span>
                            <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50" title="Tentar Novamente">
                              {emittingId === sale.id ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-amber-400 font-semibold text-xs flex items-center justify-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 whitespace-nowrap">
                            <Clock size={12}/> Pendente
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-zinc-600 font-medium text-xs">-</span>
                        <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50">
                          {emittingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />} Gerar
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-emerald-400 font-black text-lg">R$ {Number(sale.total).toFixed(2)}</span>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    Você ainda não efetuou nenhuma venda hoje. Vá ao PDV e teste!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExportXmlModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}
