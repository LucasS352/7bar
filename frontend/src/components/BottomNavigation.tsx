import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart2, Package, User, LogOut, X, History, Banknote } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';

const navItems = [
  {
    label: 'Analytics',
    to: '/dashboard',
    icon: BarChart2,
    exact: true,
  },
  {
    label: 'Estoque',
    to: '/dashboard/inventory',
    icon: Package,
    exact: false,
  },
  {
    label: 'Caixas',
    to: '/dashboard/registers',
    icon: History,
    exact: false,
  },
  {
    label: 'Despesas',
    to: '/dashboard/finance/payables',
    icon: Banknote,
    exact: false,
  },
];

interface BottomNavigationProps {
  tenantConfig?: any;
}

export function BottomNavigation({ tenantConfig }: BottomNavigationProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setProfileOpen(false);
  };

  const modules = (() => {
    try {
      if (tenantConfig?.modulos) {
        return typeof tenantConfig.modulos === 'string' ? JSON.parse(tenantConfig.modulos) : tenantConfig.modulos;
      }
    } catch (e) {
      console.error("Erro ao ler módulos no BottomNavigation:", e);
    }
    return { estoque: true, nfce: true, dashboardMobile: true };
  })();

  const activeNavItems = navItems.filter((item) => {
    if (item.to === '/dashboard/inventory' && modules.estoque === false) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="
          fixed bottom-0 inset-x-0 z-50
          md:hidden
          bg-zinc-900/95 backdrop-blur-xl
          border-t border-zinc-800
          flex items-center justify-around
          h-16
          safe-area-bottom
        "
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {activeNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 ${
                isActive
                  ? 'text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300 active:scale-90'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-blue-500/15' : ''}`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Perfil Tab */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all duration-200"
        >
          <div className="p-1 rounded-xl">
            <User size={22} strokeWidth={1.8} />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Perfil</span>
        </button>
      </nav>

      {/* Profile Drawer (bottom sheet) */}
      {profileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setProfileOpen(false)}
          />

          {/* Sheet */}
          <div
            className="
              fixed bottom-0 inset-x-0 z-[70]
              md:hidden
              bg-zinc-900 border-t border-zinc-800
              rounded-t-3xl
              p-6
              animate-in slide-in-from-bottom-4 duration-300
            "
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <User size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-tight">{user?.name || 'Usuário'}</p>
                <p className="text-zinc-400 text-sm capitalize">{user?.role || 'Operador'} · {user?.tenant || ''}</p>
              </div>
            </div>

            {tenantConfig && (
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3 mb-6 text-sm text-zinc-300">
                <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-2">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-blue-400">CNPJ</div>
                  <span className="font-semibold text-white">{tenantConfig.cnpj || 'CNPJ não informado'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Endereço</span>
                  <p className="leading-relaxed text-xs">
                    {tenantConfig.logradouro ? (
                      <>
                        {tenantConfig.logradouro}, {tenantConfig.numero}
                        {tenantConfig.complemento ? ` - ${tenantConfig.complemento}` : ''}
                        <br />
                        {tenantConfig.bairro ? `${tenantConfig.bairro}, ` : ''}
                        {tenantConfig.municipioNome ? `${tenantConfig.municipioNome} - ` : ''}
                        {tenantConfig.uf || ''}
                        {tenantConfig.cep ? ` | CEP: ${tenantConfig.cep}` : ''}
                      </>
                    ) : (
                      <span className="text-zinc-500 italic">Endereço não cadastrado</span>
                    )}
                  </p>
                </div>
                {tenantConfig.telefone && (
                  <div className="pt-1 text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="text-zinc-500">Contato:</span>
                    <span>{tenantConfig.telefone}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => { setProfileOpen(false); navigate('/dashboard/comandas'); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-left active:scale-[0.98] transition-all"
              >
                <User size={20} />
                Comandas / Consumo
              </button>
              <button
                onClick={() => setProfileOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-800 text-zinc-300 font-semibold text-left active:scale-[0.98] transition-all"
              >
                <X size={20} />
                Fechar
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-left active:scale-[0.98] transition-all"
              >
                <LogOut size={20} />
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
