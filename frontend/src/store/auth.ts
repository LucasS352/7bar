import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useOperatorTokenStore } from './operatorToken';
import { usePinAuthStore } from './pinAuth';
import { clearProductsCache } from '@/lib/db';

export type User = { id: string, name: string, role: string, tenant: string, groupId?: string | null, termsAccepted?: boolean, station?: string };

function clearTenantClientCaches() {
  void clearProductsCache().catch(() => {});
  if (typeof caches !== 'undefined') {
    void caches.delete('pdvpro-api-critical').catch(() => {});
  }
}

function clearOperationalTokens() {
  useOperatorTokenStore.getState().clearToken();
  usePinAuthStore.getState().clearPinAuth();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('garcom_operator');
    localStorage.removeItem('currentOperator');
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setTermsAccepted: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) =>
        set((state) => {
          const prevTenant = state.user?.tenant;
          if (prevTenant && prevTenant !== user.tenant) {
            clearTenantClientCaches();
          }
          clearOperationalTokens();
          return { token, user };
        }),
      logout: () => {
        clearOperationalTokens();
        clearTenantClientCaches();
        set({ token: null, user: null });
      },
      setTermsAccepted: () => set((state) => ({ user: state.user ? { ...state.user, termsAccepted: true } : null })),
    }),
    { name: '7bar-auth' }
  )
);
