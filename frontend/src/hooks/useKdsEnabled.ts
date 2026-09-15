import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function useKdsEnabled() {
  const token = useAuthStore((state) => state.token);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    setEnabled(false);
    if (token)
      api
        .get('/v1/kds/config')
        .then((res) => {
          if (active) setEnabled(res.data.enabled === true);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);
  return enabled;
}
