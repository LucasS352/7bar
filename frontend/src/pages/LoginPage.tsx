import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { ShoppingCart, Lock, Mail, Loader2, Zap } from 'lucide-react';

export function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuthStore();
  const navigate   = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.access_token, data.user);
      toast.success(`Bem vindo ao ${data.user.tenant}, ${data.user.name}!`);
      if (data.user.role === 'group_owner' || data.user.groupId) {
        navigate('/grupo-portal');
      } else if (data.user.role === 'admin' || data.user.role === 'superadmin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch {
      toast.error('Credenciais invalidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden py-12 px-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" style={{animationDuration:'8s'}} />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/15 blur-[140px] animate-pulse" style={{animationDuration:'10s',animationDelay:'1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] animate-pulse" style={{animationDuration:'12s',animationDelay:'2s'}} />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',backgroundSize:'40px 40px'}} />
      </div>

      {/* Slogan topo */}
      <div className="flex flex-col items-center gap-4 text-center max-w-2xl z-10 mb-8 mt-4">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] pb-1">
          PDV pra você
        </h2>
        <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-lg px-2">
          Gerencie seu estoque, vendas e caixa de qualquer lugar. Simples, rápido e do jeito que você precisa.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {['Controle de Estoque', 'PDV Mobile', 'Relatórios', 'NFC-e'].map(f => (
            <span key={f} className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Zap size={11} className="shrink-0" />
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md z-10 p-8 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative mb-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 border border-blue-400/30">
            <ShoppingCart size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Adega PDV</h1>
          <p className="text-zinc-300 mt-2 text-sm">Sistema de Ponto de Venda</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-zinc-300 ml-1">Email Profissional</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-zinc-400" />
              </div>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white placeholder-zinc-500"
                placeholder="seu@email.com.br"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300 ml-1">Senha de Acesso</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-zinc-400" />
              </div>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-white placeholder-zinc-500"
                placeholder="........"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
