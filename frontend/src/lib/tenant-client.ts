import { api } from './api';
import { useAuthStore } from '@/store/auth';

const TENANT_ME_TTL_MS = 30_000;
const cache = new Map<string, { data: any; expiresAt: number }>();
const inFlight = new Map<string, Promise<any>>();

function currentScopeKey(): string {
  const state = useAuthStore.getState();
  const token = state.token || '';
  const tenant = state.user?.tenant || '';
  return `${tenant}:${token.slice(-16)}`;
}

/** Limpa o cache em memória de `/tenants/me` após alterações de configuração da empresa. */
export function invalidateTenantMeCache() {
  cache.clear();
}

/**
 * Busca `/tenants/me` deduplicando chamadas simultâneas (ex: DashboardLayout + Page)
 * e reutilizando resposta recente por 30s dentro do mesmo tenant/sessão.
 */
export async function fetchTenantMe(forceRefresh = false): Promise<any> {
  const key = currentScopeKey();
  const now = Date.now();
  if (!forceRefresh) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) return hit.data;
    const pending = inFlight.get(key);
    if (pending) return pending;
  }

  const req = api
    .get(`/tenants/me?_t=${now}`)
    .then((res) => {
      if (cache.size >= 8) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, { data: res.data, expiresAt: Date.now() + TENANT_ME_TTL_MS });
      return res.data;
    })
    .finally(() => {
      if (inFlight.get(key) === req) inFlight.delete(key);
    });

  inFlight.set(key, req);
  return req;
}
