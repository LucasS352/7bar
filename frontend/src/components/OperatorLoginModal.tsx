import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useShift } from '@/contexts/ShiftContext';
import { Lock, User, Loader2, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

interface OperatorLoginModalProps {
  onSuccess: () => void;
}

interface OperatorData {
  id: string;
  name: string;
  hasOpenRegister?: boolean;
}

export function OperatorLoginModal({ onSuccess }: OperatorLoginModalProps) {
  const [operators, setOperators] = useState<OperatorData[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  
  const [selectedOp, setSelectedOp] = useState<OperatorData | null>(null);
  const [pin, setPin] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  const { setOperator } = useShift();
  const navigate = useNavigate();

  useEffect(() => {
    // Busca os operadores da loja.
    api.get('/operators')
      .then(res => setOperators(res.data.filter((u: any) => u.active)))
      .catch(() => toast.error('Erro ao carregar operadores.'))
      .finally(() => setLoadingOps(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp || pin.length < 4) return;
    
    setLoadingLogin(true);
    try {
      const res = await api.post('/auth/operator-login', { operatorId: selectedOp.id, pin });
      setOperator(res.data);
      toast.success(`Bem-vindo, ${res.data.name}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'PIN incorreto.');
      setPin('');
    } finally {
      setLoadingLogin(false);
    }
  };

  const { logout } = useAuthStore();

  const handleGlobalLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Lock className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Seleção de Operador</h2>
          <p className="text-zinc-400 mt-2">Escolha seu perfil e informe seu PIN para acessar o PDV.</p>
        </div>

        {loadingOps ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : !selectedOp ? (
          <div className="grid grid-cols-2 gap-4">
            {operators.map(op => (
              <button
                key={op.id}
                onClick={() => setSelectedOp(op)}
                className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/50 p-4 rounded-2xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-zinc-800 group-hover:bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <User className="text-zinc-400 group-hover:text-blue-400 transition-colors" size={24} />
                </div>
                <div className="flex-1 flex justify-between items-center overflow-hidden">
                  <div>
                    <p className="text-white font-bold truncate">{op.name}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{op.isManager ? 'Gerente' : 'Operador'}</p>
                  </div>
                  {op.hasOpenRegister && (
                    <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider whitespace-nowrap">
                      Ativo
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <button
              type="button"
              onClick={() => { setSelectedOp(null); setPin(''); }}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold mb-4"
            >
              <ArrowLeft size={16} /> Voltar aos operadores
            </button>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="text-blue-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">{selectedOp.name}</h3>
              <p className="text-zinc-500 text-sm">{selectedOp.isManager ? 'Gerente de Caixa' : 'Operador'}</p>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-400 mb-2 block text-center">Digite seu PIN (4-6 dígitos)</label>
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                className="w-full bg-zinc-950 border-2 border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-4 text-center text-3xl tracking-[1em] font-black text-white outline-none transition-colors"
                placeholder="••••"
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin || pin.length < 4}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 text-lg active:scale-95"
            >
              {loadingLogin ? <Loader2 className="animate-spin" size={24} /> : <Lock size={20} />}
              Acessar PDV
            </button>
          </form>
        )}
        
        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="text-zinc-500 hover:text-zinc-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <LayoutDashboard size={16} /> Voltar ao Painel Administrativo
          </button>
          
          <button 
            onClick={handleGlobalLogout} 
            className="text-red-500/70 hover:text-red-400 font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut size={14} /> Sair do Sistema (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
