import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Páginas
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { DashboardPage } from './pages/DashboardPage';
import { DemoRegisterPage } from './pages/DemoRegisterPage';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';

// Páginas do Dashboard
import { InventoryPage } from './pages/dashboard/InventoryPage';
import { RegistersPage } from './pages/dashboard/RegistersPage';
import { EmpresaPage } from './pages/dashboard/EmpresaPage';
import { TributacaoPage } from './pages/dashboard/TributacaoPage';
import { ComandasPage } from './pages/dashboard/ComandasPage';
import UsersPage from './app/dashboard/users/page';
import CategoriesPage from './app/dashboard/inventory/categories/page';
import MassEntryPage from './app/dashboard/inventory/purchases/page';
import XmlImportPage from './app/dashboard/inventory/purchases/imports/page';
import MassEditPage from './app/dashboard/inventory/mass-edit/page';
import StockEntryPage from './app/dashboard/inventory/stock-entry/page';
import StockCountPage from './app/dashboard/inventory/stock-count/page';
import SysInitPage from './app/sys-init/page';
import GroupPortalPage from './pages/GroupPortalPage';
import SuppliersPage from './app/dashboard/suppliers/page';
import PurchaseOrdersPage from './app/dashboard/purchase-orders/page';
import PayablesPage from './app/dashboard/finance/payables/page';
import PaymentMethodsPage from './app/dashboard/configuracoes/payment-methods/page';
import AjusteFiscalPage from './app/dashboard/configuracoes/ajuste-fiscal/page';
import FiscalManagementPage from './app/dashboard/fiscal/gestao/page';
import BulkImagesPage from './pages/dashboard/BulkImagesPage';
import VitrinePage from './pages/dashboard/VitrinePage';
import VitrineTvPage from './pages/VitrineTvPage';
import { GarcomPage } from './pages/GarcomPage';

// Stores
import { useAuthStore } from './store/auth';

// Estilos globais
import './app/globals.css';
import { TermsAcceptanceModal } from './components/TermsAcceptanceModal';
import { OverduePaymentBanner } from './components/OverduePaymentBanner';

// ── PWA Service Worker ──────────────────────────────────────────────────────
// O vite-plugin-pwa injeta automaticamente o registro do SW.
// O arquivo 'virtual:pwa-register' é gerado pelo plugin em tempo de build.
// Em desenvolvimento (npm run dev), o SW roda em modo simulado se devOptions.enabled=true
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  // Quando uma nova versão do SW estiver disponível, recarrega silenciosamente
  onNeedRefresh() {
    updateSW(true); // força atualização imediata sem prompt
  },
  onOfflineReady() {
    console.log('[7bar PWA] App pronto para uso offline!');
  },
});

// Verifica por atualizações sempre que o usuário retorna ao app (troca de aba, desbloqueia celular, etc.)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    updateSW(); // checa se há nova versão do SW disponível
  }
});

// ── Componentes de Rota Protegida ────────────────────────────────────────────
const IS_DEMO = import.meta.env.VITE_APP_MODE === 'demo';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to={IS_DEMO ? '/demo' : '/login'} replace />;
  if (user?.role === 'stockist') return <Navigate to="/dashboard/inventory" replace />;
  return <><OverduePaymentBanner />{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  const allowedRoles = ['admin', 'superadmin', 'stockist'];
  if (!allowedRoles.includes(user?.role || '')) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={IS_DEMO ? <Navigate to="/demo" replace /> : <LoginPage />} />
        <Route path="/demo" element={<DemoRegisterPage />} />
        <Route path="/sys-init" element={<SysInitPage />} />
        <Route path="/grupo-portal" element={<GroupPortalPage />} />
        {/* Vitrine Digital — rotas públicas para TV (sem autenticação) */}
        <Route path="/vitrine/:tvPublicId" element={<VitrineTvPage />} />
        <Route path="/v/:tvPublicId" element={<VitrineTvPage />} />

        {/* PDV — rota raiz protegida */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <PosPage />
            </PrivateRoute>
          }
        />

        {/* Modo Garçom — interface dedicada mobile-first (sem caixa obrigatório) */}
        <Route
          path="/garcom"
          element={
            <PrivateRoute>
              <GarcomPage />
            </PrivateRoute>
          }
        />

        {/* Dashboard e sub-rotas */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/categories" element={<CategoriesPage />} />
          <Route path="inventory/purchases" element={<MassEntryPage />} />
          <Route path="inventory/purchases/imports" element={<XmlImportPage />} />
          <Route path="inventory/mass-edit" element={<MassEditPage />} />
          <Route path="inventory/stock-entry" element={<StockEntryPage />} />
          <Route path="inventory/stock-count" element={<StockCountPage />} />
          <Route path="registers" element={<RegistersPage />} />
          <Route path="configuracoes/empresa" element={<EmpresaPage />} />
          <Route path="configuracoes/tributacao" element={<TributacaoPage />} />
          <Route path="equipe" element={<UsersPage />} />
          <Route path="comandas" element={<ComandasPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="finance/payables" element={<PayablesPage />} />
          <Route path="configuracoes/payment-methods" element={<PaymentMethodsPage />} />
          <Route path="configuracoes/ajuste-fiscal" element={<AjusteFiscalPage />} />
          <Route path="fiscal/gestao" element={<FiscalManagementPage />} />
          <Route path="bulk-images" element={<BulkImagesPage />} />
          <Route path="vitrine" element={<VitrinePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast global */}
      <Toaster 
        theme="dark" 
        position="top-center" 
        richColors 
        duration={2000}
        toastOptions={{
          style: { 
            fontSize: '0.95rem', 
            padding: '16px', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} 
      />
      <TermsAcceptanceModal />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
