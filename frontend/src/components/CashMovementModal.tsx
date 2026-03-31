import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { X, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function CashMovementModal({ isOpen, onClose, registerId }: { isOpen: boolean, onClose: (success: boolean) => void, registerId: string }) {
  const [type, setType] = useState<'IN' | 'OUT'>('OUT');
  const [value, setValue] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      toast.error('Gasto inválido');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/cash-registers/${registerId}/movement`, { type, value: Number(value), reason });
      toast.success(type === 'OUT' ? 'Sangria registrada com sucesso!' : 'Suprimento registrado com sucesso!');
      onClose(true);
    } catch (err: any) {
      toast.error('Erro ao processar movimentação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800/80">
          <h2 className="text-xl font-bold flex items-center gap-2">Sangria / Suprimento</h2>
          <button onClick={() => onClose(false)} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => setType('OUT')}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'OUT' ? 'border-red-500 bg-red-500/10 text-red-500 shadow-inner' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
            >
              <ArrowDownRight size={28} />
              <span className="font-bold">Sangria (Saída)</span>
            </button>
            <button 
              type="button"
              onClick={() => setType('IN')}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${type === 'IN' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-inner' : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
            >
              <ArrowUpRight size={28} />
              <span className="font-bold">Suprimento (Entrada)</span>
            </button>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-2 block">Diga o Valor da Operação</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xl">R$</span>
              <input 
                autoFocus
                type="number" 
                step="0.01"
                required
                value={value}
                onChange={e => setValue(parseFloat(e.target.value) || '')}
                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-2xl font-black text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
            </div>
          </div>

          <div>
             <label className="text-sm font-semibold text-zinc-400 mb-2 block">Motivo / Descrição <span className="text-xs text-zinc-600 font-normal">(Opcional)</span></label>
             <input 
                type="text" 
                placeholder="Ex: Pagamento fornecedor, Vale, Troco Extra..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
             />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${type === 'OUT' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
          >
            {submitting ? <Loader2 className="animate-spin" /> : (type === 'OUT' ? 'Retirar Dinheiro (Sangria)' : 'Injetar Reforço (Suprimento)')}
          </button>

        </form>
      </div>
    </div>
  );
}
