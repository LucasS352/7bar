"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { History, Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { CloseRegisterModal } from '@/components/CloseRegisterModal';

type CashRegister = {
  id: string;
  userId: string;
  openingTime: string;
  closingTime?: string;
  openingValue: number;
  closingValue?: number;
  status: string;
};

export default function CashRegistersHistoryPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/cash-registers')
      .then(res => setRegisters(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Update register status when modal closes
  const handleModalClose = (closed: boolean) => {
    setSelectedId(null);
    if (closed) {
      // Refresh the list
      setLoading(true);
      api.get('/cash-registers')
        .then(res => setRegisters(res.data))
        .finally(() => setLoading(false));
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <History className="text-blue-500" size={32} /> Histórico e Auditoria de Caixas
        </h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold">Relatórios Anteriores</h2>
          <p className="text-zinc-500 text-sm mt-1">Acompanhe todos os turnos abertos e fechados na história da loja. Audite eventuais quebras de caixa do passado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Abertura</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-left">Fechamento</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Fundo (Início)</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">Terminou com</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {registers.map(reg => (
                <tr key={reg.id} className="hover:bg-zinc-800/40 transition-colors group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    {reg.status === 'open' ? (
                       <span className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 w-fit tracking-wider"><CheckCircle2 size={14}/> ABERTO</span>
                    ) : (
                       <span className="flex items-center gap-2 text-zinc-500 font-bold text-[11px] bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700 w-fit tracking-wider"><XCircle size={14}/> FECHADO</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-zinc-300 font-medium whitespace-nowrap">
                    {new Date(reg.openingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -')}
                  </td>
                  <td className="px-6 py-5 text-zinc-500 whitespace-nowrap">
                    {reg.closingTime ? new Date(reg.closingTime).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }).replace(',', ' -') : '--'}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-blue-400">
                    R$ {reg.openingValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-zinc-400">
                    {typeof reg.closingValue === 'number' ? `R$ ${reg.closingValue.toFixed(2)}` : '--'}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => setSelectedId(reg.id)}
                      className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors inline-block"
                      title={reg.status === 'open' ? "Fechar Caixa" : "Ver Auditoria"}
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {registers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Nenhum caixa encontrado no banco de dados da loja.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CloseRegisterModal 
        isOpen={!!selectedId} 
        registerId={selectedId || ''} 
        onClose={handleModalClose} 
      />
    </div>
  );
}
