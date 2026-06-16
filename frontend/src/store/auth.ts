import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = { id: string, name: string, role: string, tenant: string, termsAccepted?: boolean };

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
      login: (token, user) => set({ token, user }),
      logout: () => {
        sessionStorage.removeItem('currentOperator');
        set({ token: null, user: null });
      },
      setTermsAccepted: () => set((state) => ({ user: state.user ? { ...state.user, termsAccepted: true } : null })),
    }),
    { name: '7bar-auth' }
  )
);
