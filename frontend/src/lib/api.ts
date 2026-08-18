import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  // Usa caminho relativo '/api'. O proxy do Vite (dev) ou Nginx (prod) repassa para o backend.
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Não desloga a sessão global da loja se o erro 401 for apenas uma tentativa incorreta de PIN ou senha
    const isAuthEndpoint = 
      url.includes('/auth/operator-login') || 
      url.includes('/auth/login') ||
      Boolean(error.config?.skipAuthRedirect);

    if (error.response?.status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
