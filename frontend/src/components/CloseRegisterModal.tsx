import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Loader2, X, AlertOctagon, Receipt, Trash2, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useShift } from '@/contexts/ShiftContext';

export function CloseRegisterModal({ isOpen, onClose, registerId }: { isOpen: boolean, onClose: (closed: boolean) => void, registerId: string | undefined }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closingValue, setClosingValue] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1 = auditoria, 2 = confirmação final

  const { user } = useAuthStore();
  const { operator } = useShift();
  // canSeeTotals é baseado no operador DONO DO CAIXA (não em quem está logado).
  // Se o caixa pertence a um Gerente -> mostra totais. Se é de Colaborador -> auditoria cega.
  // Depois que data carrega, usamos data.register.operator.isManager.
  // Antes de carregar, fallback para isAdmin para não bloquear o painel admin.
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const canSeeTotals = isAdmin || Boolean(data?.register?.operator?.isManager);

  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInitiateCancel = (saleId: string) => {
    setCancelSaleId(saleId);
    setCancelReason('');
  };

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento.');
      return;
    }
    setCancelling(true);
    try {
      await api.post(`/sales/${cancelSaleId}/cancel`, { reason: cancelReason });
      toast.success('Venda cancelada com sucesso. Estoque e caixa atualizados.');
      
      const res = await api.get(`/cash-registers/${registerId}/report`);
      setData(res.data);
      setClosingValue(res.data.report.expectedDinheiro);
      setCancelSaleId(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao cancelar venda.');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !registerId) return;
    setLoading(true);
    setData(null);
    setStep(1);
    api.get(`/cash-registers/${registerId}/report`)
      .then(res => {
        setData(res.data);
        setClosingValue(res.data.report.expectedDinheiro);
      })
      .catch(() => toast.error('Falha ao gerar relatório detalhado'))
      .finally(() => setLoading(false));
  }, [isOpen, registerId]);

  if (!isOpen) return null;
  if (!mounted) return null;

  // Sem caixa aberto: mostra aviso em vez de travar
  if (!registerId) {
    const fallbackContent = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl">
          <p className="text-zinc-400 text-lg">Nenhum caixa aberto no momento.</p>
          <button onClick={() => onClose(false)} className="mt-6 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition">Fechar</button>
        </div>
      </div>
    );
    return createPortal(fallbackContent, document.body);
  }

  // Avança para a tela de confirmação (passo 2) — zera o campo para o operador preencher manualmente
  const goToConfirmation = () => {
    setClosingValue(0);
    setStep(2);
  };

  // Fecha o caixa de verdade (chamado apenas no passo 2)
  const handleClose = async () => {
    setSubmitting(true);
    try {
      const payload = canSeeTotals ? { closingValue } : { closingValue: null };
      await api.post(`/cash-registers/${registerId}/close`, payload);
      toast.success('Caixa encerrado formalmente. Bom descanso!');
      onClose(true);
    } catch (e: any) {
      toast.error('Erro ao fechar caixa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAudit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/cash-registers/${registerId}/audit`, { closingValue });
      toast.success('Auditoria salva com sucesso!');
      onClose(true);
    } catch (e: any) {
      toast.error('Erro ao salvar auditoria');
    } finally {
      setSubmitting(false);
    }
  };

  const modalBody = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 lg:p-8 transition-all">
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-6xl shadow-[0_0_100px_rgba(239,68,68,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col h-full max-h-[95vh] lg:max-h-[90vh]">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-3"><FileText className="text-red-500" /> Auditoria de Fechamento</h2>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={48} /></div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
            
            {/* Lado Esquerdo: Resumo Financeiro e Declaração */}
            <div className="w-full lg:w-[45%] h-auto lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/20 lg:overflow-y-auto custom-scrollbar shrink-0">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center text-xs text-zinc-400 pb-2 border-b border-zinc-800">
                  <span>Abertura: <strong className="text-zinc-300 text-sm ml-1">{new Date(data.register.openingTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</strong></span>
                  <span>Vendas do Turno: <strong className="text-zinc-300 text-sm ml-1">{data.report.countSales}</strong></span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                    <span className="text-zinc-400">Fundo de Troco (Inicial)</span>
                    <span className="font-bold text-white">R$ {Number(data.register.openingValue).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between p-4 bg-emerald-500/5 text-emerald-400 rounded-2xl border border-emerald-500/10">
                    <span>(+) Recebimentos em Dinheiro Físico</span>
                    <span className="font-bold text-lg">+ R$ {Number(data.report.totalDinheiro).toFixed(2)}</span>
                  </div>
                  
                  {data.report.totalSuprimentos > 0 && (
                    <div className="flex flex-col p-4 bg-blue-500/5 text-blue-400 rounded-2xl border border-blue-500/10">
                      <div className="flex justify-between items-center w-full border-b border-blue-500/10 pb-2 mb-2">
                        <span>(+) Suprimentos Injetados (Reforço)</span>
                        <span className="font-bold text-lg">+ R$ {Number(data.report.totalSuprimentos).toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 mt-1">
                        {data.report.movements.filter((m: any) => m.type === 'IN').map((m: any) => (
                           <div key={m.id} className="flex justify-between text-xs text-blue-400/80 items-center">
                             <div className="flex items-center gap-2">
                               <span className="bg-blue-500/10 px-1.5 py-0.5 rounded font-mono border border-blue-500/20">{new Date(m.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                               <span className="line-clamp-1">{m.reason || 'Sem descrição informada'}</span>
                             </div>
                             <span className="font-bold whitespace-nowrap">R$ {Number(m.value).toFixed(2)}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.report.totalSangrias > 0 && (
                    <div className="flex flex-col p-4 bg-red-500/5 text-red-500 rounded-2xl border border-red-500/10">
                      <div className="flex justify-between items-center w-full border-b border-red-500/10 pb-2 mb-2">
                        <span>(-) Sangrias Transferidas (Vales, etc)</span>
                        <span className="font-bold text-lg">- R$ {Number(data.report.totalSangrias).toFixed(2)}</span>
                      </div>
                      <div className="space-y-1.5 mt-1">
                        {data.report.movements.filter((m: any) => m.type === 'OUT').map((m: any) => (
                           <div key={m.id} className="flex justify-between text-xs text-red-400/80 items-center">
                             <div className="flex items-center gap-2">
                               <span className="bg-red-500/10 px-1.5 py-0.5 rounded font-mono border border-red-500/20">{new Date(m.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                               <span className="line-clamp-1">{m.reason || 'Sem descrição informada'}</span>
                             </div>
                             <span className="font-bold whitespace-nowrap">R$ {Number(m.value).toFixed(2)}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-sm">
                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-3">Recebimentos Digitais (Em Conta)</p>
                    <div className="flex justify-between text-indigo-400">
                      <span>Cartão de Crédito</span>
                      <span className="font-bold">R$ {Number(data.report.totalCredito || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sky-400">
                      <span>Cartão de Débito</span>
                      <span className="font-bold">R$ {Number(data.report.totalDebito || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-teal-400">
                      <span>Transferências (Pix)</span>
                      <span className="font-bold">R$ {Number(data.report.totalPix || 0).toFixed(2)}</span>
                    </div>
                    {(data.report.customMethods || []).map((cm: any) => (
                      <div key={cm.method} className="flex justify-between text-purple-400">
                        <span>{cm.label}</span>
                        <span className="font-bold">R$ {Number(cm.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {canSeeTotals && (
                    <div className="flex justify-between p-4 bg-zinc-800/20 text-white rounded-2xl border border-zinc-700/50 mt-4">
                      <span className="text-zinc-300">Faturamento Bruto <span className="text-xs text-zinc-500 block">Todas transações da sessão</span></span>
                      <span className="font-black text-xl self-center">R$ {Number(data.report.totalVendas || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {canSeeTotals ? (
                  <div className="p-5 border-l-4 border-l-red-500 bg-red-500/10 rounded-r-2xl border border-red-500/20">
                    <p className="text-xs text-red-500 font-extrabold uppercase tracking-widest mb-2">Total Esperado na Gaveta</p>
                    <p className="text-4xl font-black text-red-400 drop-shadow-sm">R$ {Number(data.report.expectedDinheiro).toFixed(2)}</p>
                  </div>
                ) : (
                  <div className="p-5 border-l-4 border-l-blue-500 bg-blue-500/10 rounded-r-2xl border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-extrabold uppercase mb-2 flex items-center gap-2"><EyeOff size={14}/> Auditoria Cega</p>
                    <p className="text-zinc-300 text-sm">Você não tem acesso ao valor esperado. O gerente fará a conferência da gaveta no fechamento.</p>
                  </div>
                )}

                {data.register.status === 'closed' ? (
                  <div className="pt-4 text-center bg-zinc-950 rounded-[2rem] p-6 border border-zinc-800 shadow-inner">
                     {data.register.closingValue == null ? (
                       canSeeTotals ? (
                         <div className="text-left">
                           <p className="text-amber-500 font-bold mb-2 flex items-center gap-2"><AlertOctagon size={16}/> Pendente de Auditoria</p>
                           <p className="text-zinc-400 text-sm mb-4">Este caixa foi fechado às cegas por um operador. Insira a contagem da gaveta para finalizar a auditoria.</p>
                           <div className="flex gap-2">
                             <input 
                               type="number" 
                               step="0.01"
                               value={closingValue || ''}
                               onChange={e => setClosingValue(parseFloat(e.target.value) || 0)}
                               placeholder="R$ 0,00"
                               className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold"
                             />
                             <button 
                               onClick={handleAudit}
                               disabled={submitting}
                               className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 rounded-xl flex items-center gap-2"
                             >
                               {submitting ? <Loader2 className="animate-spin" size={18}/> : 'Auditar'}
                             </button>
                           </div>
                         </div>
                       ) : (
                         <p className="text-amber-500 font-bold flex justify-center gap-2 items-center"><AlertOctagon size={18}/> Fechamento Pendente de Auditoria</p>
                       )
                     ) : (
                       <>
                         <p className="text-zinc-500 text-sm">Este caixa já foi auditado e encerrado formalmente.</p>
                         <p className="text-emerald-400 font-black text-2xl mt-4 flex justify-center gap-2 items-center">
                           Declarado: R$ {Number(data.register.closingValue).toFixed(2)}
                         </p>
                         {Number(data.register.closingValue) !== Number(data.report.expectedDinheiro) && (
                            <p className="text-red-400 text-sm mt-4 border border-red-500/30 bg-red-500/10 inline-block px-4 py-2 rounded-full font-bold">
                              <AlertOctagon size={16} className="inline mr-1 -mt-0.5"/> Diferença Constatada (Quebra): R$ {(Number(data.register.closingValue) - Number(data.report.expectedDinheiro)).toFixed(2)}
                            </p>
                         )}
                       </>
                     )}
                  </div>
                ) : (
                  // Sem input aqui — o operador digita o valor somente na próxima tela
                  <div className="pt-2 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-center">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Próximo passo</p>
                    <p className="text-zinc-300 text-sm mt-1">{canSeeTotals ? 'Você irá conferir e digitar o valor físico da gaveta na próxima tela.' : 'Você irá encerrar este turno definitivamente na próxima tela.'}</p>
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
                    onClick={goToConfirmation}
                    className="w-full py-5 rounded-2xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4 text-lg"
                  >
                    Confirmar Gaveta e Continuar →
                  </button>
                )}
              </div>
            </div>

            {/* Lado Direito: Transações Detalhadas (Painel Rolável Grande) */}
            <div className="w-full lg:w-[55%] h-auto lg:h-full flex flex-col bg-zinc-950/80 shrink-0">
              <div className="p-6 border-b border-zinc-800/80 flex items-center gap-3 bg-zinc-900/30">
                 <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                   <Receipt size={22}/>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Registro Individual de Operações</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Todas as {data.report.countSales} transações logadas neste turno.</p>
                 </div>
              </div>
              
              <div className="flex-1 h-auto lg:h-full overflow-y-visible lg:overflow-y-auto custom-scrollbar p-6 space-y-4 animate-fade-in">
                {data.report.salesDetails && data.report.salesDetails.length > 0 ? (
                  data.report.salesDetails.map((s: any) => (
                    <div key={s.id} className={`bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition-all group relative overflow-hidden ${s.status === 'cancelled' ? 'opacity-40 border-red-900/20' : ''}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.status === 'cancelled' ? 'bg-red-500/40' : 'bg-zinc-800 group-hover:bg-blue-500'} transition-colors`}></div>
                      
                      <div className="flex justify-between items-start mb-4 border-b border-zinc-800/50 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-inner text-sm tracking-widest">
                             {new Date(s.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </span>
                          <span className="text-zinc-600 text-xs font-mono bg-zinc-950 px-2 py-1 rounded">ID: {s.id.split('-')[0]}</span>
                          {s.status === 'cancelled' && (
                            <span className="bg-red-500/10 text-red-500 text-[10px] uppercase font-bold px-2.5 py-1 rounded border border-red-500/20 animate-pulse">
                              Cancelada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-extrabold text-xl ${s.status === 'cancelled' ? 'text-zinc-500 line-through decoration-red-500/50 decoration-2' : 'text-emerald-400'}`}>
                            R$ {Number(s.total).toFixed(2)}
                          </span>
                          {isAdmin && s.status !== 'cancelled' && data.register.status === 'open' && (
                            <button
                              onClick={() => handleInitiateCancel(s.id)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all border border-red-500/20 shadow-lg active:scale-95 cursor-pointer ml-1"
                              title="Cancelar Venda"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <ul className="text-zinc-400 text-sm space-y-2 mb-5 ml-1">
                        {s.items.map((i: any) => (
                          <li key={i.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800/40 rounded-lg transition-colors">
                             <span className="text-white font-bold bg-zinc-800 px-2 py-0.5 rounded text-xs">{i.quantity}x</span> 
                             <span className={`flex-1 font-medium ${s.status === 'cancelled' ? 'line-through text-zinc-500' : ''}`}>{i.product?.name || 'Item Removido/Desconhecido'}</span>
                             <span className="text-zinc-500 font-mono text-xs">R$ {(Number(i.priceUnit) * Number(i.quantity)).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/50">
                        {s.payments.map((p: any, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-blue-500/20 tracking-wider">
                            {p.method} (R$ {Number(p.value).toFixed(2)})
                          </span>
                        ))}
                      </div>

                      {s.status === 'cancelled' && s.cancelReason && (
                        <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-xs text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                          <strong>Motivo do Cancelamento:</strong> {s.cancelReason}
                          {s.cancelledAt && (
                            <span className="block mt-1 text-[10px] text-zinc-500">
                              Cancelado em: {new Date(s.cancelledAt).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      )}
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

      {/* ═══ PASSO 2 — Confirmação Final de Fechamento ═══ */}
      {step === 2 && data && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
                  <FileText className="text-red-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Confirmação de Fechamento</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Revise os valores antes de encerrar definitivamente</p>
                </div>
              </div>
              <button onClick={() => setStep(1)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">

              {/* Campo principal — contar dinheiro na gaveta — só aparece para Gerentes */}
              {canSeeTotals && (
                <div className="bg-zinc-900 border-2 border-zinc-700 focus-within:border-red-500 rounded-2xl p-5 transition-colors">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">💵 Contagem Física da Gaveta</p>
                  <p className="text-zinc-400 text-sm mb-4">Conte o dinheiro físico que está na gaveta agora e informe o total abaixo:</p>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-2xl">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      autoFocus
                      value={closingValue || ''}
                      onChange={e => setClosingValue(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl py-5 pl-16 pr-5 text-4xl font-black text-white focus:outline-none focus:border-red-500 transition-colors shadow-inner placeholder:text-zinc-700"
                    />
                  </div>
                  <p className="text-zinc-600 text-xs mt-3 text-center">O sistema esperava <strong className="text-zinc-400">R$ {Number(data.report.expectedDinheiro).toFixed(2)}</strong> na gaveta</p>
                </div>
              )}

              {/* Banner de Status — só exibe após o operador digitar um valor */}
              {closingValue > 0 && (() => {
                const diff = closingValue - Number(data.report.expectedDinheiro);
                const bateu = Math.abs(diff) < 0.01;
                const sobra = diff > 0.01;
                return (
                  <div className={`rounded-2xl p-5 border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200 ${bateu ? 'bg-emerald-500/10 border-emerald-500/30' : sobra ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 ${bateu ? 'bg-emerald-500/20' : sobra ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
                      {bateu ? '✅' : sobra ? '⚠️' : '🔴'}
                    </div>
                    <div>
                      {bateu ? (
                        <>
                          <p className="text-emerald-400 font-black text-xl">Caixa Conferido!</p>
                          <p className="text-emerald-400/70 text-sm mt-0.5">O valor declarado bate exatamente com o esperado pelo sistema.</p>
                        </>
                      ) : sobra ? (
                        <>
                          <p className="text-amber-400 font-black text-xl">Sobra de R$ {diff.toFixed(2)}</p>
                          <p className="text-amber-400/70 text-sm mt-0.5">O valor declarado é maior que o esperado. Verifique se houve engano.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-red-400 font-black text-xl">Quebra de R$ {Math.abs(diff).toFixed(2)}</p>
                          <p className="text-red-400/70 text-sm mt-0.5">O valor declarado está abaixo do esperado. A diferença será registrada na auditoria.</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Grid: Dinheiro Físico + Digitais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Dinheiro Físico */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">💵 Dinheiro Físico (Gaveta)</p>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Fundo inicial</span>
                    <span className="text-white font-bold">R$ {Number(data.register.openingValue).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-400">Vendas em dinheiro</span>
                    <span className="text-emerald-400 font-bold">+ R$ {Number(data.report.totalDinheiro).toFixed(2)}</span>
                  </div>
                  {data.report.totalSuprimentos > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Suprimentos (reforço)</span>
                      <span className="text-blue-400 font-bold">+ R$ {Number(data.report.totalSuprimentos).toFixed(2)}</span>
                    </div>
                  )}
                  {data.report.totalSangrias > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Sangrias</span>
                      <span className="text-red-400 font-bold">- R$ {Number(data.report.totalSangrias).toFixed(2)}</span>
                    </div>
                  )}
                  {canSeeTotals && (
                    <>
                      <div className="border-t border-zinc-700 pt-3 flex justify-between items-center bg-red-500/10 -mx-5 px-5 pb-3">
                        <span className="text-red-400 font-bold uppercase tracking-wider text-xs">Total Esperado na Gaveta</span>
                        <span className="text-red-400 font-black text-3xl drop-shadow-sm">R$ {Number(data.report.expectedDinheiro).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Você declarou</span>
                        <span className={`font-black text-xl ${Math.abs(closingValue - Number(data.report.expectedDinheiro)) < 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                          R$ {Number(closingValue).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Recebimentos Digitais */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">💳 Recebimentos Digitais</p>
                  <p className="text-[11px] text-zinc-600">Estes valores estão em conta — não entram na gaveta</p>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-indigo-400">Cartão de Crédito</span>
                    <span className="text-indigo-300 font-bold">R$ {Number(data.report.totalCredito || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-sky-400">Cartão de Débito</span>
                    <span className="text-sky-300 font-bold">R$ {Number(data.report.totalDebito || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-teal-400">Pix</span>
                    <span className="text-teal-300 font-bold">R$ {Number(data.report.totalPix || 0).toFixed(2)}</span>
                  </div>
                  {(data.report.customMethods || []).map((cm: any) => (
                    <div key={cm.method} className="flex justify-between items-center text-sm">
                      <span className="text-purple-400">{cm.label}</span>
                      <span className="text-purple-300 font-bold">R$ {Number(cm.total || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-700 pt-3 flex justify-between items-center">
                    <span className="text-zinc-300 font-bold text-sm">Total Digital</span>
                    <span className="text-white font-black text-xl">
                      R$ {(Number(data.report.totalCredito || 0) + Number(data.report.totalDebito || 0) + Number(data.report.totalPix || 0) + (data.report.customMethods || []).reduce((a: number, m: any) => a + Number(m.total || 0), 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo total - Apenas para Admins */}
              {isAdmin && (
                <div className="flex justify-between items-center bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4">
                  <span className="text-zinc-300 font-bold">Faturamento Total do Turno</span>
                  <span className="text-white font-black text-2xl">R$ {Number(data.report.totalVendas || 0).toFixed(2)}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-sm"
                >
                  ← Voltar e Revisar
                </button>
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-2xl font-black bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white transition-all shadow-lg shadow-red-900/30 active:scale-95 flex items-center justify-center gap-2 text-base"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : '🔒 Encerrar Caixa Definitivamente'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );

  return createPortal(modalBody, document.body);
}

