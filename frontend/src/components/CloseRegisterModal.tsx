import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Loader2, X, AlertOctagon, Receipt } from 'lucide-react';

export function CloseRegisterModal({ isOpen, onClose, registerId }: { isOpen: boolean, onClose: (closed: boolean) => void, registerId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closingValue, setClosingValue] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !registerId) return;
    setLoading(true);
    api.get(`/cash-registers/${registerId}/report`)
      .then(res => {
        setData(res.data);
        setClosingValue(res.data.report.expectedDinheiro);
      })
      .catch((err) => toast.error('Falha ao gerar relatório detalhado'))
      .finally(() => setLoading(false));
  }, [isOpen, registerId]);

  if (!isOpen) return null;

  const handleClose = async () => {
    setSubmitting(true);
    try {
      await api.post(`/cash-registers/${registerId}/close`, { closingValue });
      toast.success('Auditoria validada. O Caixa foi encerrado formalmente.');
      onClose(true);
    } catch (e: any) {
      toast.error('Erro ao fechar caixa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 lg:p-8 transition-all">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-6xl shadow-[0_0_100px_rgba(239,68,68,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col h-full max-h-[95vh] lg:max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-2xl font-bold flex items-center gap-3"><FileText className="text-red-500" /> Auditoria de Fechamento</h2>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={48} /></div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Lado Esquerdo: Resumo Financeiro e Declaração */}
            <div className="w-full lg:w-[45%] flex flex-col border-r border-zinc-800 bg-zinc-900/20 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center text-xs text-zinc-400 pb-2 border-b border-zinc-800">
                  <span>Abertura: <strong className="text-zinc-300 text-sm ml-1">{new Date(data.register.openingTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</strong></span>
                  <span>Vendas do Turno: <strong className="text-zinc-300 text-sm ml-1">{data.report.countSales}</strong></span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                    <span className="text-zinc-400">Fundo de Troco (Inicial)</span>
                    <span className="font-bold text-white">R$ {data.register.openingValue.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between p-4 bg-emerald-500/5 text-emerald-400 rounded-2xl border border-emerald-500/10">
                    <span>(+) Recebimentos em Dinheiro Físico</span>
                    <span className="font-bold text-lg">+ R$ {data.report.totalDinheiro.toFixed(2)}</span>
                  </div>
                  
                  {data.report.totalSuprimentos > 0 && (
                    <div className="flex flex-col p-4 bg-blue-500/5 text-blue-400 rounded-2xl border border-blue-500/10">
                      <div className="flex justify-between items-center w-full border-b border-blue-500/10 pb-2 mb-2">
                        <span>(+) Suprimentos Injetados (Reforço)</span>
                        <span className="font-bold text-lg">+ R$ {data.report.totalSuprimentos.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 mt-1">
                        {data.report.movements.filter((m: any) => m.type === 'IN').map((m: any) => (
                           <div key={m.id} className="flex justify-between text-xs text-blue-400/80 items-center">
                             <div className="flex items-center gap-2">
                               <span className="bg-blue-500/10 px-1.5 py-0.5 rounded font-mono border border-blue-500/20">{new Date(m.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                               <span className="line-clamp-1">{m.reason || 'Sem descrição informada'}</span>
                             </div>
                             <span className="font-bold whitespace-nowrap">R$ {m.value.toFixed(2)}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.report.totalSangrias > 0 && (
                    <div className="flex flex-col p-4 bg-red-500/5 text-red-500 rounded-2xl border border-red-500/10">
                      <div className="flex justify-between items-center w-full border-b border-red-500/10 pb-2 mb-2">
                        <span>(-) Sangrias Transferidas (Vales, etc)</span>
                        <span className="font-bold text-lg">- R$ {data.report.totalSangrias.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 mt-1">
                        {data.report.movements.filter((m: any) => m.type === 'OUT').map((m: any) => (
                           <div key={m.id} className="flex justify-between text-xs text-red-400/80 items-center">
                             <div className="flex items-center gap-2">
                               <span className="bg-red-500/10 px-1.5 py-0.5 rounded font-mono border border-red-500/20">{new Date(m.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                               <span className="line-clamp-1">{m.reason || 'Sem descrição informada'}</span>
                             </div>
                             <span className="font-bold whitespace-nowrap">R$ {m.value.toFixed(2)}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-sm">
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-3">Recebimentos Digitais (Em Conta)</p>
                    <div className="flex justify-between text-indigo-400">
                      <span>Cartão de Crédito</span>
                      <span className="font-bold">R$ {data.report.totalCredito?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sky-400">
                      <span>Cartão de Débito</span>
                      <span className="font-bold">R$ {data.report.totalDebito?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-teal-400">
                      <span>Transferências (Pix)</span>
                      <span className="font-bold">R$ {data.report.totalPix?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between p-4 bg-zinc-800/20 text-white rounded-2xl border border-zinc-700/50 mt-4">
                    <span className="text-zinc-300">Faturamento Bruto <span className="text-xs text-zinc-500 block">Todas transações da sessão</span></span>
                    <span className="font-black text-xl self-center">R$ {data.report.totalVendas?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-5 border-l-4 border-l-red-500 bg-red-500/10 rounded-r-2xl border border-red-500/20">
                  <p className="text-xs text-red-500 font-extrabold uppercase tracking-widest mb-2">Total Esperado na Gaveta</p>
                  <p className="text-4xl font-black text-red-400 drop-shadow-sm">R$ {data.report.expectedDinheiro.toFixed(2)}</p>
                </div>

                {data.register.status === 'closed' ? (
                  <div className="pt-4 text-center bg-zinc-950 rounded-[2rem] p-6 border border-zinc-800 shadow-inner">
                     <p className="text-zinc-500 text-sm">Este caixa já foi auditado e encerrado formalmente.</p>
                     <p className="text-emerald-400 font-black text-2xl mt-4 flex justify-center gap-2 items-center">
                       Declarado: R$ {typeof data.register.closingValue === 'number' ? data.register.closingValue.toFixed(2) : '--'}
                     </p>
                     {data.register.closingValue !== data.report.expectedDinheiro && (
                        <p className="text-red-400 text-sm mt-4 border border-red-500/30 bg-red-500/10 inline-block px-4 py-2 rounded-full font-bold">
                          <AlertOctagon size={16} className="inline mr-1 -mt-0.5"/> Diferença Constatada (Quebra): R$ {(data.register.closingValue - data.report.expectedDinheiro).toFixed(2)}
                        </p>
                     )}
                  </div>
                ) : (
                  <div className="pt-4">
                    <label className="text-sm font-semibold text-zinc-400 mb-3 block">Digite o dinheiro real conferido por você na gaveta:</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-2xl">R$</span>
                      <input 
                        type="number" 
                        value={closingValue}
                        onChange={e => setClosingValue(parseFloat(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl py-5 pl-16 pr-5 text-3xl font-black text-white focus:outline-none focus:border-red-500 transition-colors shadow-inner"
                      />
                    </div>
                    {closingValue !== data.report.expectedDinheiro && (
                      <div className="mt-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                        <AlertOctagon size={24} className="shrink-0 mt-0.5"/> 
                        <p><strong>Atenção:</strong> O valor informado difere matematicamente do esperado pelo sistema. Uma quebra de <strong>R$ {(closingValue - data.report.expectedDinheiro).toFixed(2)}</strong> será registrada no histórico de auditoria.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {data.register.status === 'closed' ? (
                  <button 
                    onClick={() => onClose(true)}
                    className="w-full py-5 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-all flex items-center justify-center gap-2 mt-4 text-lg"
                  >
                    Fechar Resumo
                  </button>
                ) : (
                  <button 
                    onClick={handleClose}
                    disabled={submitting}
                    className="w-full py-5 rounded-2xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4 text-lg"
                  >
                    {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Gaveta e Encerrar Caixa'}
                  </button>
                )}
              </div>
            </div>

            {/* Lado Direito: Transações Detalhadas (Painel Rolável Grande) */}
            <div className="w-full lg:w-[55%] flex flex-col bg-zinc-950/80">
              <div className="p-6 border-b border-zinc-800/80 flex items-center gap-3 bg-zinc-900/30">
                 <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                   <Receipt size={22}/>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Registro Individual de Operações</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Todas as {data.report.countSales} transações logadas neste turno.</p>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {data.report.salesDetails && data.report.salesDetails.length > 0 ? (
                  data.report.salesDetails.map((s: any) => (
                    <div key={s.id} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-colors group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-800 group-hover:bg-blue-500 transition-colors"></div>
                      
                      <div className="flex justify-between items-start mb-4 border-b border-zinc-800/50 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-inner text-sm tracking-widest">
                             {new Date(s.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </span>
                          <span className="text-zinc-600 text-xs font-mono bg-zinc-950 px-2 py-1 rounded">ID: {s.id.split('-')[0]}</span>
                        </div>
                        <span className="text-emerald-400 font-extrabold text-xl">R$ {s.total.toFixed(2)}</span>
                      </div>
                      
                      <ul className="text-zinc-400 text-sm space-y-2 mb-5 ml-1">
                        {s.items.map((i: any) => (
                          <li key={i.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800/40 rounded-lg transition-colors">
                             <span className="text-white font-bold bg-zinc-800 px-2 py-0.5 rounded text-xs">{i.quantity}x</span> 
                             <span className="flex-1 font-medium">{i.product?.name || 'Item Removido/Desconhecido'}</span>
                             <span className="text-zinc-500 font-mono text-xs">R$ {(i.priceUnit * i.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/50">
                        {s.payments.map((p: any, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-blue-500/20 tracking-wider">
                            {p.method} (R$ {p.value.toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 py-20">
                    <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                      <Receipt size={40} className="text-zinc-700"/>
                    </div>
                    <p className="font-medium text-zinc-500">Nenhuma transação efetuada nesta sessão.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
