import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function OperationalRoute({ module, children }: { module: 'waiter' | 'kds'; children: ReactNode }) {
  const { token, user } = useAuthStore();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    setAllowed(null);
    const check = () => api.get('/auth/access/config').then(({ data }) => {
      if (active) setAllowed(module === 'waiter' ? data.waiter : data.stations.some((s: string) => s !== 'WAITER'));
    }).catch(() => { if (active) setAllowed(false); });
    if (token) void check();
    const timer = setInterval(() => { if (token) void check(); }, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [token, module]);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.station && (user.station === 'WAITER') !== (module === 'waiter')) return <Navigate to={user.station === 'WAITER' ? '/garcom' : '/kds'} replace />;
  if (allowed === null) return <p className="p-6">Verificando acesso…</p>;
  if (!allowed) return <p role="alert" className="p-6">Módulo indisponível para esta loja. Consulte o administrador.</p>;
  return <>{children}</>;
}
