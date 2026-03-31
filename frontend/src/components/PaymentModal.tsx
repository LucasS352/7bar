import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CreditCard, Banknote, QrCode, X, Loader2, Plus, Trash2 } from 'lucide-react';

export function PaymentModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { total, items, clearCart } = useCartStore();
  
  const [payments, setPayments] = useState<{ id: string, method: string, value: number, given: number }[]>([]);
  const [method, setMethod] = useState<'dinheiro' | 'pix' | 'credito' | 'debito'>('dinheiro');
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Cálculos dinâmicos da conta
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0);
  const remaining = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setMethod('dinheiro');
      setInputValue(total.toFixed(2));
    }
  }, [isOpen, total]);

  useEffect(() => {
    if (remaining > 0) {
      setInputValue(remaining.toFixed(2));
    } else {
      setInputValue('');
    }
  }, [remaining]);

  if (!isOpen) return null;

  const handleAddPayment = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Digite um valor numérico válido.');
      return;
    }

    if (remaining <= 0) {
      toast.error('O valor total já foi atingido.');
      return;
    }

    let actualValue = val;
    let given = val;

    // Tratativa de troco: Se der mais dinheiro que o necessário, a "venda" registra só o que faltava
    if (method !== 'dinheiro' && val > remaining) {
       toast.error('No cartão/Pix o valor não pode ser maior que o saldo devedor.');
       return;
    }

    if (method === 'dinheiro' && val > remaining) {
       actualValue = remaining;
    }

    setPayments([...payments, { id: Math.random().toString(), method, value: actualValue, given }]);
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const handleConfirm = async () => {
    if (remaining > 0) {
      toast.error(`Ainda falta pagar R$ ${remaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/sales/checkout', {
        items: items.map(i => ({ productId: i.id, quantity: i.quantity, priceUnit: i.priceSell })),
        payments: payments.map(p => ({ method: p.method, value: p.value }))
      });
      toast.success('Compra Paga! Venda finalizada com sucesso!');
      clearCart();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculo visual do troco apenas para repassar o valor em mãos (usando o given vs o valor real abatido)
  const change = payments.filter(p => p.method === 'dinheiro').reduce((acc, p) => acc + (p.given - p.value), 0);

  const methodNames: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Crédito', debito: 'Débito' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-2xl font-bold text-white tracking-tight">Finalizar Pagamento</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Painel Esquerdo: Seleção e Add */}
          <div className="space-y-6">
            <div>
              <span className="text-zinc-400 font-medium block mb-3">Selecione o Método</span>
              <div className="grid grid-cols-2 gap-2">
                {[ 
                  { id: 'dinheiro', icon: Banknote, label: 'Dinheiro', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:border-emerald-500 ring-emerald-500' },
                  { id: 'pix', icon: QrCode, label: 'Pix', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20 hover:border-teal-500 ring-teal-500' },
                  { id: 'credito', icon: CreditCard, label: 'Crédito', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500 ring-indigo-500' },
                  { id: 'debito', icon: CreditCard, label: 'Débito', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:border-sky-500 ring-sky-500' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id as any)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      method === m.id 
                      ? `${m.color} ring-2 ring-offset-2 ring-offset-zinc-900`
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    <m.icon size={20} />
                    <span className="font-semibold text-sm">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="text-zinc-400 text-sm font-medium mb-2 block">Deseja passar qual valor?</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-xl font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                    disabled={remaining <= 0}
                  />
                </div>
                <button 
                  onClick={handleAddPayment}
                  disabled={remaining <= 0}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white p-3.5 rounded-xl transition flex items-center justify-center flex-shrink-0"
                >
                  <Plus size={22} />
                </button>
              </div>
              {method === 'dinheiro' && parseFloat(inputValue) > remaining && remaining > 0 && (
                <p className="text-emerald-400/80 text-xs mt-2 italic">A quantia excede a conta. O sistema repassará {((parseFloat(inputValue)||0) - remaining).toFixed(2)} de troco.</p>
              )}
            </div>
          </div>

          {/* Painel Direito: Resumo */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-zinc-400 font-medium">Total da Venda</span>
                <span className="text-2xl font-black text-white">R$ {total.toFixed(2)}</span>
              </div>

              <div className="space-y-2 mb-4">
                {payments.length === 0 && <p className="text-zinc-600 text-sm text-center py-4 border border-dashed border-zinc-800 rounded-lg">Nenhum pagamento lançado</p>}
                {payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm group">
                    <span className="font-semibold text-zinc-300 flex items-center gap-2">
                       {p.method === 'dinheiro' ? <Banknote size={14} className="text-emerald-500"/> : <CreditCard size={14} className="text-blue-500"/>}
                       {methodNames[p.method]}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">R$ {p.value.toFixed(2)}</span>
                      <button onClick={() => handleRemovePayment(p.id)} className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              {change > 0 && (
                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                  <span className="text-emerald-400 font-medium text-sm border border-emerald-500/30 px-2 py-0.5 rounded-md bg-emerald-500/10">Repassar Troco</span>
                  <span className="text-xl font-black text-emerald-400">R$ {change.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-end">
                <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Falta Pagar</span>
                <span className={`text-4xl font-black ${remaining > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>R$ {remaining.toFixed(2)}</span>
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Rodapé Confirmar */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={handleConfirm}
            disabled={loading || remaining > 0}
            className="w-full py-4 rounded-xl font-bold text-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(37,99,235,0.3)] disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Emitir Cupom e Finalizar'}
          </button>
        </div>

      </div>
    </div>
  );
}
