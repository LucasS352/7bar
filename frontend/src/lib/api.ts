import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const api = axios.create({
  // Atualizado para pegar a porta 3520 e permitir o IP da rede
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3520') + '/api',
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
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
