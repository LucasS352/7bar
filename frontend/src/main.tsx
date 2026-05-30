import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Páginas
import { LoginPage } from './pages/LoginPage';
import { PosPage } from './pages/PosPage';
import { DashboardPage } from './pages/DashboardPage';

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
import StockEntryPage from './app/dashboard/inventory/stock-entry/page';
import SysInitPage from './app/sys-init/page';

// Stores
import { useAuthStore } from './store/auth';

// Estilos globais
import './app/globals.css';

// ── PWA Service Worker ──────────────────────────────────────────────────────
// O vite-plugin-pwa injeta automaticamente o registro do SW.
// O arquivo 'virtual:pwa-register' é gerado pelo plugin em tempo de build.
// Em desenvolvimento (npm run dev), o SW roda em modo simulado se devOptions.enabled=true
import { registerSW } from 'virtual:pwa-register';

registerSW({
  // Quando uma nova versão do SW estiver disponível, recarrega a página
  onNeedRefresh() {
    // Você pode customizar isso com um toast "Nova versão disponível"
    window.location.reload();
  },
  onOfflineReady() {
    console.log('[7bar PWA] App pronto para uso offline!');
  },
});

// ── Componentes de Rota Protegida ────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── Root App ─────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/sys-init" element={<SysInitPage />} />

        {/* PDV — rota raiz protegida */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <PosPage />
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
          <Route path="inventory/stock-entry" element={<StockEntryPage />} />
          <Route path="registers" element={<RegistersPage />} />
          <Route path="configuracoes/empresa" element={<EmpresaPage />} />
          <Route path="configuracoes/tributacao" element={<TributacaoPage />} />
          <Route path="equipe" element={<UsersPage />} />
          <Route path="comandas" element={<ComandasPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Toast global */}
      <Toaster theme="dark" position="top-center" richColors />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
