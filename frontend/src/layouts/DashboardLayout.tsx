import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, History, ArrowLeft, LogOut, Settings, FileText, Building2, Users, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { getFullUrl } from '@/lib/getFullUrl';

export function DashboardLayout() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      else setIsCollapsed(false);
    };
    handleResize(); // initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      api.get(`/tenants/me?_t=${Date.now()}`).then(res => setTenantConfig(res.data)).catch(console.error);
    }
  }, [token]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { name: 'Analytics',           to: '/dashboard',                        icon: LayoutDashboard },
    { name: 'Catálogo e Estoque',   to: '/dashboard/inventory',              icon: Package },
    { name: 'Histórico de Caixas',  to: '/dashboard/registers',              icon: History },
  ];

  const configItems = [
    { name: 'Empresa',             to: '/dashboard/configuracoes/empresa',    icon: Building2 },
    { name: 'Grupos Tributários',  to: '/dashboard/configuracoes/tributacao', icon: FileText },
    { name: 'Gestão de Equipe',    to: '/dashboard/equipe',                   icon: Users },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 relative`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-zinc-800 border border-zinc-700 rounded-full p-1 hover:bg-zinc-700 transition-colors z-50 text-zinc-400"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-zinc-800 flex flex-col items-center text-center min-h-[120px] justify-center transition-opacity duration-300 ${isCollapsed ? 'px-2' : ''}`}>
          {tenantConfig === null ? (
             <div className="h-10 w-32 bg-zinc-800/50 animate-pulse rounded-lg"></div>
          ) : tenantConfig?.logoUrl ? (
            <img src={getFullUrl(tenantConfig.logoUrl)} alt="Logo" className={`${isCollapsed ? 'h-8' : 'h-20'} w-full object-contain drop-shadow-md transition-all`} />
          ) : (
            <h1 className={`${isCollapsed ? 'text-xs' : 'text-2xl'} font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent truncate w-full`}>
              {tenantConfig?.nomeFantasia || tenantConfig?.razaoSocial || 'Admin'}
            </h1>
          )}
          {!isCollapsed && <p className="text-zinc-500 text-sm mt-2 animate-in fade-in">{user?.tenant || 'Carregando...'}</p>}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <NavLink
              key={item.to} to={item.to} end={item.to === '/dashboard'}
              title={isCollapsed ? item.name : ''}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`
              }
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-semibold whitespace-nowrap animate-in fade-in slide-in-from-left-2">{item.name}</span>}
            </NavLink>
          ))}

          <div className="pt-4 pb-1">
            <p className={`text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-2 ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
              <Settings size={12} /> {!isCollapsed && <span className="animate-in fade-in">Configurações</span>}
            </p>
            {configItems.map(item => (
              <NavLink
                key={item.to} to={item.to}
                title={isCollapsed ? item.name : ''}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isCollapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`
                }
              >
                <item.icon size={17} className="shrink-0" />
                {!isCollapsed && <span className="font-semibold whitespace-nowrap animate-in fade-in slide-in-from-left-2">{item.name}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <NavLink to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`} title="Voltar ao PDV">
            <ArrowLeft size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-semibold whitespace-nowrap animate-in fade-in">Voltar ao PDV</span>}
          </NavLink>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left ${isCollapsed ? 'justify-center px-0' : ''}`} title="Sair">
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-semibold whitespace-nowrap animate-in fade-in">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-zinc-950 p-8 custom-scrollbar">
        {/* Outlet renderiza as sub-rotas do Dashboard */}
        <Outlet />
      </main>
    </div>
  );
}
