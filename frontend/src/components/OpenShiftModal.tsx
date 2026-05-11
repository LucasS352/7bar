import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useShift } from '@/contexts/ShiftContext';
import { Wallet, Loader2, AlertOctagon } from 'lucide-react';

interface OpenShiftModalProps {
  onSuccess: () => void;
}

export function OpenShiftModal({ onSuccess }: OpenShiftModalProps) {
  const { operator, refreshShift, logoutOperator } = useShift();
  const [openingValue, setOpeningValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalOpenRegister, setGlobalOpenRegister] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/cash-registers/current');
        if (res.data) {
          setGlobalOpenRegister(res.data);
        }
      } catch (err) {
        console.error('Erro ao validar status global:', err);
      } finally {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, []);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) return;
    
    // Parse the value (replace comma with dot if user typed it)
    const val = parseFloat(openingValue.replace(',', '.') || '0');
    
    if (isNaN(val) || val < 0) {
      toast.error('Informe um valor de abertura válido.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/cash-registers/open', { openingValue: val, operatorId: operator.id });
      toast.success('Caixa aberto com sucesso!');
      await refreshShift();
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao abrir caixa.');
      // Tenta atualizar se o erro for de caixa já aberto
      await refreshShift();
    } finally {
      setLoading(false);
    }
  };

  if (!operator || isChecking) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (globalOpenRegister) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-4">
        <div className="bg-zinc-900 border border-emerald-500/20 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 text-center animate-in fade-in zoom-in-95 duration-300">
           <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 rotate-3">
             <AlertOctagon className="text-emerald-500" size={40} />
           </div>
           <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Caixa Já Aberto!</h2>
           <p className="text-zinc-400 mb-8 text-lg leading-relaxed">
             Detectamos que já existe um turno em andamento para esta loja. <br/>
             Deseja **continuar** as operações neste caixa?
           </p>
           
           <div className="grid gap-4">
             <button
               onClick={async () => {
                 setLoading(true);
                 await refreshShift();
                 setLoading(false);
               }}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] flex justify-center items-center gap-3 text-xl active:scale-95"
             >
               {loading ? <Loader2 className="animate-spin" /> : 'Sim, Continuar Vendas'}
             </button>
             
             <button
               onClick={() => logoutOperator()}
               className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-4 rounded-2xl transition-all text-sm"
             >
               Não, Trocar de Operador
             </button>
           </div>
        </div>
      </div>
    );
  }
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Wallet className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Abertura de Caixa</h2>
          <p className="text-zinc-400 mt-2">Informe o valor inicial (fundo de troco) para iniciar seu turno.</p>
        </div>

        <form onSubmit={handleOpen} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-zinc-400 mb-2 block">Operador Atual</label>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold cursor-not-allowed opacity-70">
              {operator.name}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-400 mb-2 block">Fundo de Caixa (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={openingValue}
              onChange={e => setOpeningValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-4 text-2xl font-black text-emerald-400 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 text-lg active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Abrir Caixa e Iniciar Turno'}
          </button>

          <button
            type="button"
            onClick={() => {
              logoutOperator();
            }}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-sm"
          >
            Trocar Operador / Sair
          </button>
        </form>
      </div>
    </div>
  );
}
