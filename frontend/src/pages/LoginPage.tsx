import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { ShoppingCart, Lock, Mail, Loader2, Trophy } from 'lucide-react';

const COPA_IMAGES = [
  '/copa/162679014360f6d9000011c_1626790143_3x2_md.jpg',
  '/copa/GettyImages-1446999450.jpg',
  '/copa/brasil_servia_richarlison_2_gol_2.jpg.jpg',
  '/copa/brazil-national-football-team-hall-of-fame-players-t0xddwnsw6y45tyi.jpg',
  '/copa/brazil-national-football-team-neymar-richarlison-silva-noae0e4xn0xferzq.jpg',
  '/copa/jpg.jpg',
  '/copa/neymar.jpg'
];

export function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { login } = useAuthStore();
  const navigate   = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % COPA_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.access_token, data.user);
      toast.success(`Bem vindo ao ${data.user.tenant}, ${data.user.name}!`);
      if (data.user.role === 'admin' || data.user.role === 'superadmin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch {
      toast.error('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
      {/* Carrossel de Imagens */}
      {COPA_IMAGES.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out z-0 ${
            index === currentImageIndex ? 'opacity-50 scale-105' : 'opacity-0 scale-100'
          }`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      
      {/* Overlay Escuro para Legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/90 via-zinc-950/70 to-black/90 z-0 pointer-events-none"></div>

      {/* Slogan Copa */}
      <div className="absolute top-12 left-0 right-0 flex justify-center z-10 pointer-events-none">
         <div className="flex flex-col items-center gap-2">
           <Trophy size={48} className="text-yellow-400 drop-shadow-lg" />
           <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-green-400 to-blue-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
             Rumo ao Hexa
           </h2>
         </div>
      </div>

      <div className="w-full max-w-md z-10 p-8 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 shadow-[0_0_50px_rgba(34,197,94,0.15)] relative mt-16">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-500/30 border border-yellow-400/30">
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
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-white placeholder-zinc-500"
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
                className="w-full pl-10 pr-4 py-3 bg-zinc-950/60 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-white placeholder-zinc-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-green-600/30 active:scale-95 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar na Torcida'}
          </button>
        </form>
      </div>
    </div>
  );
}
