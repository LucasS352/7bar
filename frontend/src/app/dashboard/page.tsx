"use client";
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { ExportXmlModal } from '@/components/ExportXmlModal';
import { 
  DollarSign, TrendingUp, Package, Loader2, CheckCircle2, 
  XCircle, Clock, Receipt, Download, Calendar, ArrowUpRight, 
  ArrowDownRight, CreditCard, Banknote, QrCode, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { UserIcon } from 'lucide-react';

// --- Types ---
type SummaryData = {
  currentRegister: {
    total: number;
    operatorName: string;
    openedAt: string;
    cashRegisterId: string;
  } | null;
  today: { revenue: number; transactions: number };
  week: { revenue: number; vsLastWeek: number | null };
  month: { revenue: number };
  period: {
    revenue: number;
    transactions: number;
    avgTicket: number;
    byPaymentMethod: Record<string, number>;
    byHour: Record<number, number>;
    topProducts: Array<{ name: string; qty: number; revenue: number; pct: number }>;
  };
};

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
  operatorId?: string;
  cashRegisterId?: string;
};

// --- Helpers ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getMethodColor = (method: string) => {
  switch(method) {
    case 'dinheiro': return '#10b981'; // emerald-500
    case 'pix': return '#14b8a6'; // teal-500
    case 'credito': return '#6366f1'; // indigo-500
    case 'debito': return '#0ea5e9'; // sky-500
    default: return '#8b5cf6'; // purple-500
  }
};

const getMethodName = (method: string) => {
  switch(method) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'Pix';
    case 'credito': return 'Crédito';
    case 'debito': return 'Débito';
    default: return method;
  }
};

export default function SalesDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filtros de data
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Paginação e busca na tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchDashboardData = async () => {
    try {
      // Usar a mesma data se for preset 'hoje', se não calcular.
      // Para manter simples no front, vamos apenas usar o preset na lógica de exibição, 
      // mas passar as datas customizadas quando applicable.
      let sDate = startDate;
      let eDate = endDate;

      if (preset === 'today') {
        const localToday = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
        sDate = localToday; eDate = localToday;
      } else if (preset === 'week') {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        sDate = start.toLocaleDateString('en-CA');
        eDate = new Date().toLocaleDateString('en-CA');
      } else if (preset === 'month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        sDate = start.toLocaleDateString('en-CA');
        eDate = new Date().toLocaleDateString('en-CA');
      }

      // Fetch summary
      const sumRes = await api.get(`/dashboard/summary?startDate=${sDate}&endDate=${eDate}`);
      setSummary(sumRes.data);

      // Fetch transactions history for the table
      // (Para não carregar todas, ideal seria paginar no backend, mas mantendo a simplicidade atual do plano)
      const salesRes = await api.get('/sales?limit=100'); 
      setSales(salesRes.data.data || []);

    } catch (error) {
      console.error("Erro ao buscar dados do dashboard", error);
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();

    // Auto-refresh a cada 60 segundos
    const intervalId = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(intervalId);
  }, [preset, startDate, endDate]);

  const handleEmitNfce = async (saleId: string) => {
    setEmittingId(saleId);
    try {
      await api.post(`/sales/${saleId}/emit-nfce`);
      toast.success('Emissão solicitada com sucesso!');
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Erro ao emitir NFC-e';
      toast.error(msg);
    } finally {
      setEmittingId(null);
    }
  };

  // --- Renderização de Dados ---
  const isCustomOrPast = preset === 'custom' || preset === 'month' || preset === 'week'; // Define se o card de "Caixa Atual" deve estar cinza

  // Dados para gráficos
  const chartDataHour = useMemo(() => {
    if (!summary?.period.byHour) return [];
    const peak = Object.values(summary.period.byHour).reduce((a, b) => Math.max(a, b), 0);
    return Object.entries(summary.period.byHour).map(([hour, value]) => ({
      name: `${hour}h`,
      value,
      isPeak: value > 0 && value === peak,
    }));
  }, [summary]);

  const chartDataPayment = useMemo(() => {
    if (!summary?.period.byPaymentMethod) return [];
    return Object.entries(summary.period.byPaymentMethod)
      .filter(([_, val]) => val > 0)
      .map(([method, value]) => ({
        name: getMethodName(method),
        value,
        color: getMethodColor(method)
      }));
  }, [summary]);

  // Filtragem da tabela
  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const lower = searchTerm.toLowerCase();
    return sales.filter(s => 
      s.total.toString().includes(lower) || 
      s.items.some(i => i.product?.name.toLowerCase().includes(lower)) ||
      s.payments.some(p => p.method.toLowerCase().includes(lower))
    );
  }, [sales, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && !summary) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* --- HEADER & FILTROS --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-white">Dashboard Analytics</h1>
          <p className="text-zinc-400 mt-1 hidden md:block">Acompanhe o desempenho do seu negócio em tempo real.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-zinc-900 p-2 rounded-2xl border border-zinc-800 overflow-x-auto custom-scrollbar">
            <div className="flex bg-zinc-950 p-1 rounded-xl min-w-max">
            {(['today', 'week', 'month', 'custom'] as const).map(p => (
              <button 
                key={p} 
                onClick={() => setPreset(p)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${preset === p ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Personalizado'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0 overflow-x-auto min-w-max">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <span className="text-zinc-500">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          </div>
          
          <div className="w-px h-8 bg-zinc-800 mx-1 hidden lg:block"></div>

          <button onClick={() => setIsExportModalOpen(true)} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 sm:py-2 rounded-xl transition-colors font-medium border border-zinc-700 w-full sm:w-auto mt-2 sm:mt-0">
            <Download size={18} /> <span className="sm:hidden md:inline">Exportar XML</span>
          </button>
        </div>
      </div>
      
      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        
        {/* Card 1: Caixa Atual */}
        <div className={`col-span-2 lg:col-span-1 relative overflow-hidden p-4 md:p-6 rounded-2xl border flex flex-col justify-between ${preset !== 'today' ? 'bg-zinc-900/50 border-zinc-800/50 opacity-60' : 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl'}`}>
          {preset === 'today' && summary?.currentRegister && (
            <div className="absolute top-0 right-0 p-4 flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-xs font-bold text-emerald-500 tracking-wider">ABERTO</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-zinc-400 font-medium mb-3">
            <DollarSign size={20} className={preset === 'today' && summary?.currentRegister ? "text-emerald-400" : "text-zinc-500"} /> 
            Caixa Atual
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {preset !== 'today' ? 'N/A' : (summary?.currentRegister ? formatCurrency(summary.currentRegister.total) : 'Fechado')}
            </h3>
            <p className="text-sm text-zinc-500 mt-2 flex items-center gap-1.5">
              <UserIcon size={14}/> 
              {preset !== 'today' ? 'Mude para "Hoje"' : (summary?.currentRegister?.operatorName || 'Nenhum operador')}
            </p>
          </div>
        </div>

        {/* Card 2: Hoje */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center gap-3 text-zinc-400 font-medium mb-3">
            <Calendar size={20} className="text-blue-400" /> Hoje
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
              {formatCurrency(summary?.today?.revenue || 0)}
            </h3>
            <p className="text-xs md:text-sm text-zinc-500 mt-2 flex items-center gap-1.5">
              <Receipt size={14}/> {summary?.today?.transactions || 0} transações
            </p>
          </div>
        </div>

        {/* Card 3: Semana */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center gap-3 text-zinc-400 font-medium mb-3">
            <TrendingUp size={20} className="text-purple-400" /> Semana
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
              {formatCurrency(summary?.week?.revenue || 0)}
            </h3>
            {summary?.week?.vsLastWeek !== null && summary?.week?.vsLastWeek !== undefined ? (
              <p className={`text-xs md:text-sm mt-2 flex items-center gap-1 font-medium ${summary.week.vsLastWeek >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.week.vsLastWeek >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                {Math.abs(summary.week.vsLastWeek).toFixed(1)}% vs. ant.
              </p>
            ) : (
              <p className="text-xs md:text-sm text-zinc-500 mt-2 line-clamp-1">Sem histórico anterior</p>
            )}
          </div>
        </div>

        {/* Card 4: Mês / Personalizado */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 text-zinc-400 font-medium mb-3 relative z-10">
            <Banknote size={20} className="text-amber-400" /> 
            {preset === 'custom' ? 'Total do Período' : 'Este Mês'}
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
              {formatCurrency(preset === 'custom' ? (summary?.period?.revenue || 0) : (summary?.month?.revenue || 0))}
            </h3>
             <p className="text-xs md:text-sm text-zinc-500 mt-2 flex items-center gap-1.5">
               <Receipt size={14}/> Visão macro
            </p>
          </div>
        </div>

        {/* Card 5: Ticket Médio */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center gap-3 text-zinc-400 font-medium mb-3">
            <Package size={20} className="text-sky-400" /> Ticket Médio
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">
              {formatCurrency(summary?.period?.avgTicket || 0)}
            </h3>
            <p className="text-xs md:text-sm text-zinc-500 mt-2 flex items-center gap-1.5">
              Média por venda
            </p>
          </div>
        </div>

      </div>

      {/* --- GRÁFICOS & TOP PRODUTOS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico: Vendas por Hora */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock size={20} className="text-amber-400"/> Vendas por Hora (Período Selecionado)
          </h3>
          <div className="h-[200px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartDataHour.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isPeak ? '#fbbf24' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: Mix de Pagamentos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <CreditCard size={20} className="text-emerald-400"/> Mix de Pagamentos
          </h3>
          {chartDataPayment.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataPayment}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartDataPayment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                {chartDataPayment.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                    <span className="text-zinc-300 flex-1">{p.name}</span>
                    <span className="font-bold text-white">{((p.value / summary!.period.revenue) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 italic text-sm">
              Nenhuma transação no período.
            </div>
          )}
        </div>
      </div>

      {/* --- TOP PRODUTOS E TABELA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Produtos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Package size={20} className="text-indigo-400"/> Top Produtos (Receita)
          </h3>
          <div className="space-y-5">
            {summary?.period?.topProducts?.map((p, idx) => (
              <div key={idx} className="relative">
                <div className="flex justify-between items-end mb-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-500 w-4">{idx + 1}.</span>
                    <span className="font-semibold text-zinc-200 line-clamp-1">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden flex items-center">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${p.pct}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>{p.qty} unidades vendidas</span>
                  <span>{p.pct.toFixed(1)}% do total</span>
                </div>
              </div>
            ))}
            {(!summary?.period?.topProducts || summary.period.topProducts.length === 0) && (
              <p className="text-zinc-500 text-sm italic text-center py-10">Nenhum produto vendido no período.</p>
            )}
          </div>
        </div>

        {/* Histórico de Transações */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl flex flex-col lg:col-span-2 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt size={20} className="text-blue-400"/> Histórico de Vendas
            </h3>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar valor, produto, pgto..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          {/* Tabela para Desktop */}
          <div className="hidden md:block flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Data/Hora</th>
                  <th className="px-6 py-4 font-semibold">Itens</th>
                  <th className="px-6 py-4 font-semibold">Pagamento</th>
                  <th className="px-6 py-4 font-semibold text-center">NFC-e</th>
                  <th className="px-6 py-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {currentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-300 text-sm">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sale.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-h-20 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                        {sale.items.map(i => (
                          <div key={i.id} className="text-xs flex gap-2 items-start">
                            <span className="font-bold text-blue-400 bg-blue-500/10 px-1 rounded">{i.quantity}x</span>
                            <span className="text-zinc-300 line-clamp-1">{i.product?.name || 'Desconhecido'}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.payments.map((p, idx) => (
                        <span key={idx} className="inline-block text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded mr-1">
                          {p.method}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 align-middle text-center whitespace-nowrap">
                      {sale.emitirNfce ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                          {sale.nfceStatus === 'autorizada' ? (
                            <span className="text-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <CheckCircle2 size={12}/> {sale.nfceNumero ? `Nº ${sale.nfceNumero}` : 'Autorizada'}
                            </span>
                          ) : sale.nfceStatus === 'rejeitada' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                <XCircle size={12}/> Rejeitada
                              </span>
                              <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50" title="Tentar Novamente">
                                {emittingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-amber-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <Clock size={12}/> Pendente
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50 transition-colors">
                            {emittingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />} Gerar
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="text-emerald-400 font-black text-base">{formatCurrency(sale.total)}</span>
                    </td>
                  </tr>
                ))}
                {currentSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Cards para Mobile */}
          <div className="md:hidden flex flex-col divide-y divide-zinc-800/60">
            {currentSales.map(sale => (
              <div key={sale.id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="text-zinc-300 text-sm font-medium">
                    {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(sale.createdAt))}
                  </div>
                  <div className="text-emerald-400 font-black text-lg">
                    {formatCurrency(sale.total)}
                  </div>
                </div>

                <div className="text-sm text-zinc-400 line-clamp-2">
                  {sale.items.map(i => `${i.quantity}x ${i.product?.name || 'Item'}`).join(', ')}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    {sale.payments.map((p, idx) => (
                      <span key={idx} className="inline-block text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                        {p.method}
                      </span>
                    ))}
                  </div>

                  <div>
                    {sale.emitirNfce ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        {sale.nfceStatus === 'autorizada' ? (
                          <span className="text-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 size={12}/> {sale.nfceNumero ? `Nº ${sale.nfceNumero}` : 'Autorizada'}
                          </span>
                        ) : sale.nfceStatus === 'rejeitada' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              <XCircle size={12}/> Rejeitada
                            </span>
                            <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50" title="Tentar Novamente">
                              {emittingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-amber-400 font-semibold text-[11px] flex items-center justify-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock size={12}/> Pendente
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEmitNfce(sale.id)} disabled={emittingId === sale.id} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 disabled:opacity-50 transition-colors">
                          {emittingId === sale.id ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />} Gerar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {currentSales.length === 0 && (
              <div className="p-12 text-center text-zinc-500 italic">
                Nenhuma venda encontrada.
              </div>
            )}
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-sm text-zinc-400">
              <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1} até {Math.min(currentPage * itemsPerPage, filteredSales.length)} de {filteredSales.length}</span>
              <div className="flex gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <ExportXmlModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}

}
