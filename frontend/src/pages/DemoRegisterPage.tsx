import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, ArrowRight, Loader2, Zap, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDemoMissionsStore } from '@/store/demoMissions';
import { useDemoGuideStore } from '@/store/demoGuide';

export function DemoRegisterPage() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Auto-login se vier com ?token=...&user=... na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const userParam = params.get('user');
    const operatorParam = params.get('operator');
    const registerParam = params.get('register');

    if (tokenParam && userParam) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userParam));
        login(tokenParam, parsedUser);

        // Se veio operador e caixa na URL, setar no localStorage
        if (operatorParam) {
          try {
            const parsedOp = JSON.parse(decodeURIComponent(operatorParam));
            localStorage.setItem('currentOperator', JSON.stringify(parsedOp));
          } catch (e) { /* ignora */ }
        }
        if (registerParam) {
          try {
            const parsedReg = JSON.parse(decodeURIComponent(registerParam));
            const opId = parsedReg.operatorId || 'demo-op-1';
            localStorage.setItem(`pdvpro_cached_register_${opId}`, JSON.stringify(parsedReg));
          } catch (e) { /* ignora */ }
        }

        useDemoMissionsStore.getState().resetMissions();
        useDemoGuideStore.getState().reset();
        toast.success(`Bem-vindo à demonstração, ${parsedUser.name}!`);
        navigate('/', { replace: true });
      } catch (e) {
        console.error('Erro ao processar token de demonstração', e);
      }
    }
  }, [login, navigate]);

  const formatWhatsapp = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 0) {
      formatted = `(${raw.slice(0, 2)}`;
    }
    if (raw.length > 2) {
      formatted += `) ${raw.slice(2, 7)}`;
    }
    if (raw.length > 7) {
      formatted += `-${raw.slice(7, 11)}`;
    }
    return formatted;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = whatsapp.replace(/\D/g, '');
    
    if (name.trim().length < 2) {
      toast.error('Informe seu nome para continuar.');
      return;
    }
    if (cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/demo/register', { 
        name: name.trim(), 
        whatsapp: cleanPhone 
      });
      
      const { access_token, user, operator, cashRegister } = response.data;

      // 1. Login global (JWT + user)
      login(access_token, user);

      // 2. Setar operador demo no localStorage (bypassa OperatorLoginModal)
      if (operator) {
        localStorage.setItem('currentOperator', JSON.stringify(operator));
      }

      // 3. Setar caixa aberto no localStorage (bypassa OpenShiftModal)
      if (cashRegister && operator) {
        localStorage.setItem(`pdvpro_cached_register_${operator.id}`, JSON.stringify(cashRegister));
      }

      // 4. Resetar missões para a nova sessão de degustação
      useDemoMissionsStore.getState().resetMissions();

      toast.success('Acesso liberado! Entrando no sistema...');
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error('Erro ao conectar com o ambiente demo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070a] text-white p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Modal Card - layout fiel ao print */}
      <div className="w-full max-w-[460px] z-10 p-8 rounded-3xl bg-[#0b0e14]/90 backdrop-blur-xl border border-zinc-800/80 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          TESTE GRÁTIS
        </div>

        {/* Header */}
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Conheça o sistema por dentro
        </h2>
        <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
          Preencha abaixo e acesse o ambiente de demonstração agora mesmo.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 ml-0.5">
              <User size={14} className="text-blue-400" />
              Nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#121620] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Como podemos te chamar?"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="whatsapp" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 ml-0.5">
              <Phone size={14} className="text-blue-400" />
              WhatsApp
            </label>
            <input
              id="whatsapp"
              type="tel"
              required
              value={whatsapp}
              onChange={handleWhatsappChange}
              maxLength={15}
              className="w-full bg-[#121620] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              placeholder="(00) 00000-0000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all text-base mt-6 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Acessar demonstração
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer Badges */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-5 border-t border-zinc-800/60 mt-6 font-medium">
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="text-emerald-400" />
            Acesso imediato
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            Sem compromisso
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-emerald-400" />
            Leva 10 segundos
          </span>
        </div>

      </div>
    </div>
  );
}
