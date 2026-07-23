import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, History, ArrowLeft, LogOut, Settings, FileText, Building2, Users, ChevronLeft, ChevronRight, AlertTriangle, Truck, ShoppingCart, Banknote, CreditCard, FileSpreadsheet, Images, FileDown, ReceiptText } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { getFullUrl } from '@/lib/getFullUrl';
import { BottomNavigation } from '@/components/BottomNavigation';

export function DashboardLayout() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tenantConfig, setTenantConfig] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      else setIsCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      api.get(`/tenants/me?_t=${Date.now()}`).then(res => setTenantConfig(res.data)).catch(console.error);
    }
  }, [token]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const modules = (() => {
    try {
      if (tenantConfig?.modulos) {
        return typeof tenantConfig.modulos === 'string' ? JSON.parse(tenantConfig.modulos) : tenantConfig.modulos;
      }
    } catch (e) {
      console.error("Erro ao ler módulos do tenant:", e);
    }
    return { estoque: true, nfce: true, dashboardMobile: true };
  })();

  const navItems = [
    { name: 'Analytics',          to: '/dashboard',                       icon: LayoutDashboard },
    ...(modules.estoque !== false ? [
      { name: 'Catálogo e Estoque', to: '/dashboard/inventory',             icon: Package },
      { name: 'Fornecedores',       to: '/dashboard/suppliers',             icon: Truck },
      { name: 'Pedidos de Compra',  to: '/dashboard/purchase-orders',       icon: ShoppingCart }
    ] : []),
    { name: 'Histórico de Caixas',to: '/dashboard/registers',             icon: History },
    ...(modules?.comandas === true ? [
      { name: 'Comandas & Mesas', to: '/dashboard/comandas',              icon: Users }
    ] : [
      { name: 'Cons. Colaborador', to: '/dashboard/comandas',         icon: Users }
    ]),
    { name: 'Contas a Pagar',     to: '/dashboard/finance/payables',      icon: Banknote },
  ];
  const inventoryToolItems = [
    { name: 'Contagem de Estoque', to: '/dashboard/inventory/stock-count', icon: FileSpreadsheet },
    { name: 'Imagens em Massa',   to: '/dashboard/bulk-images',            icon: Images },
    ...(modules.nfce !== false ? [
      { name: 'Importar XML (Sefaz)',     to: '/dashboard/inventory/purchases/imports', icon: FileDown },
      { name: 'Gestão & Relatório NFC-e', to: '/dashboard/fiscal/gestao',                 icon: ReceiptText },
      { name: 'Ajuste Fiscal',           to: '/dashboard/configuracoes/ajuste-fiscal',     icon: FileSpreadsheet },
    ] : []),
  ];
  const configItems = [
    { name: 'Empresa',            to: '/dashboard/configuracoes/empresa',           icon: Building2 },
    ...(modules.nfce !== false ? [
      { name: 'Grupos Tributários', to: '/dashboard/configuracoes/tributacao',        icon: FileText },
    ] : []),
    { name: 'Formas de Pagamento', to: '/dashboard/configuracoes/payment-methods',   icon: CreditCard },
    { name: 'Gestão de Equipe',   to: '/dashboard/equipe',                           icon: Users },
  ];

  const pathname = window.location.pathname;
  const isEstoqueBlocked = modules.estoque === false && pathname.startsWith('/dashboard/inventory');
  const isNfceBlocked = modules.nfce === false && (
    pathname.startsWith('/dashboard/configuracoes/tributacao') ||
    pathname.startsWith('/dashboard/configuracoes/ajuste-fiscal') ||
    pathname.startsWith('/dashboard/fiscal/gestao') ||
    pathname.startsWith('/dashboard/inventory/purchases/imports')
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-zinc-900 border-r border-zinc-800 transition-all duration-300 relative`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-zinc-800 border border-zinc-700 rounded-full p-1 hover:bg-zinc-700 transition-colors z-50 text-zinc-400"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-zinc-800 flex flex-col items-center text-center min-h-[120px] justify-center ${isCollapsed ? 'px-2' : ''}`}>
          {tenantConfig === null ? (
            <div className="h-10 w-32 bg-zinc-800/50 animate-pulse rounded-lg" />
          ) : tenantConfig?.logoUrl ? (
            <img src={getFullUrl(tenantConfig.logoUrl)} alt="Logo" className={`${isCollapsed ? 'h-8' : 'h-20'} w-full object-contain drop-shadow-md transition-all`} />
          ) : (
            <h1 className={`${isCollapsed ? 'text-xs' : 'text-2xl'} font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent truncate w-full`}>
              {tenantConfig?.nomeFantasia || tenantConfig?.razaoSocial || 'Admin'}
            </h1>
          )}
          {!isCollapsed && <p className="text-zinc-500 text-sm mt-2">{user?.tenant || 'Carregando...'}</p>}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} title={isCollapsed ? item.name : ''}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-semibold whitespace-nowrap">{item.name}</span>}
            </NavLink>
          ))}
          <div className="pt-4 pb-1 hidden md:block">
            <p className={`text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
              <FileSpreadsheet size={12} />{!isCollapsed && <span>Inventário</span>}
            </p>
            {inventoryToolItems.map(item => (
              <NavLink key={item.to} to={item.to} title={isCollapsed ? item.name : ''}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
              >
                <item.icon size={17} className="shrink-0" />
                {!isCollapsed && <span className="font-semibold whitespace-nowrap">{item.name}</span>}
              </NavLink>
            ))}
          </div>
          <div className="pt-4 pb-1">
            <p className={`text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2 flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
              <Settings size={12} />{!isCollapsed && <span>Configurações</span>}
            </p>
            {configItems.map(item => (
              <NavLink key={item.to} to={item.to} title={isCollapsed ? item.name : ''}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
              >
                <item.icon size={17} className="shrink-0" />
                {!isCollapsed && <span className="font-semibold whitespace-nowrap">{item.name}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <NavLink to="/" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
            <ArrowLeft size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-semibold whitespace-nowrap">Voltar ao PDV</span>}
          </NavLink>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left ${isCollapsed ? 'justify-center' : ''}`}>
            <LogOut size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-semibold whitespace-nowrap">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main — pb-20 on mobile to clear BottomNav, p-3 on mobile */}
      <main className="flex-1 overflow-y-auto bg-zinc-950 p-3 md:p-8 pb-20 md:pb-8 custom-scrollbar">
        {(isEstoqueBlocked || isNfceBlocked) ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-md animate-[fadeIn_0.3s_ease]">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500 shadow-lg shadow-amber-500/10">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Módulo Desativado</h2>
            <p className="text-zinc-400 mt-2 max-w-md">Este recurso não está habilitado para o plano da sua empresa. Entre em contato com o suporte para ativá-lo.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 px-5 rounded-xl transition-all">
              Ir para o Analytics
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Bottom Navigation — mobile only (md:hidden inside component) */}
      <BottomNavigation tenantConfig={tenantConfig} />
    </div>
  );
}
