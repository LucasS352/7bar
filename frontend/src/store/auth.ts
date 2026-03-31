import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = { id: string, name: string, role: string, tenant: string };

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: '7bar-auth' }
  )
);
