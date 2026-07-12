import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';

interface Operator {
  id: string;
  name: string;
  role: string;
  isManager?: boolean;
}

interface CashRegister {
  id: string;
  status: string;
}

interface ShiftContextType {
  operator: Operator | null;
  cashRegister: CashRegister | null;
  setOperator: (op: Operator | null) => void;
  setCashRegister: (reg: CashRegister | null) => void;
  isLoading: boolean;
  logoutOperator: () => void;
  // operatorId opcional: quando passado, usa esse valor diretamente (evita closure stale)
  refreshShift: (operatorId?: string) => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── refreshShift: aceita operatorId EXPLÍCITO para evitar closure stale ───
  // Sempre que possível, passe o operatorId diretamente em vez de depender
  // do estado `operator`, pois o estado pode não ter sido atualizado ainda
  // no momento em que a função é chamada (stale closure).
  const refreshShift = useCallback(async (operatorId?: string) => {
    // Resolve o ID: prioriza o parâmetro explícito, depois lê a sessão,
    // por último tenta o estado atual (menos confiável em transitions).
    const resolvedId = operatorId
      ?? (() => {
        try {
          const saved = localStorage.getItem('currentOperator');
          return saved ? JSON.parse(saved).id : null;
        } catch { return null; }
      })()
      ?? operator?.id;

    if (!resolvedId) return;

    try {
      const res = await api.get(`/cash-registers/current?operatorId=${resolvedId}`);
      const register = res.data || null;
      setCashRegister(register);

      if (register) {
        localStorage.setItem(`pdvpro_cached_register_${resolvedId}`, JSON.stringify(register));
      } else {
        localStorage.removeItem(`pdvpro_cached_register_${resolvedId}`);
      }
    } catch (err) {
      console.error('Erro ao buscar caixa atual:', err);
    }
  }, [operator?.id]);

  // ─── Inicialização: carrega operador da sessão e busca o caixa dele ─────────
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const savedOp = localStorage.getItem('currentOperator');
        const currentOp = savedOp ? JSON.parse(savedOp) : null;

        if (currentOp) {
          setOperator(currentOp);
          // Passa o ID explicitamente para não depender do estado que acabou de ser setado
          const res = await api.get(`/cash-registers/current?operatorId=${currentOp.id}`);
          setCashRegister(res.data || null);
        } else {
          setOperator(null);
          setCashRegister(null);
        }
      } catch (err) {
        console.error('Erro na inicialização do turno:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Polling a cada 30s para detectar fechamentos feitos em outro dispositivo/aba
    const interval = setInterval(async () => {
      try {
        const savedOp = localStorage.getItem('currentOperator');
        const currentOp = savedOp ? JSON.parse(savedOp) : null;
        if (currentOp) {
          const res = await api.get(`/cash-registers/current?operatorId=${currentOp.id}`);
          setCashRegister(res.data || null);
        }
      } catch { /* silencia erros de rede no polling */ }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // ─── Ao trocar de operador: limpa caixa IMEDIATAMENTE e busca o novo ────────
  useEffect(() => {
    if (operator) {
      localStorage.setItem('currentOperator', JSON.stringify(operator));
      // 1. Limpa o caixa anterior de forma SÍNCRONA antes do fetch
      setCashRegister(null);
      // 2. Busca o caixa do novo operador passando o ID EXPLICITAMENTE
      //    (não depende do closure de refreshShift)
      const fetchRegister = async () => {
        try {
          const res = await api.get(`/cash-registers/current?operatorId=${operator.id}`);
          setCashRegister(res.data || null);
        } catch (err) {
          console.error('Erro ao buscar caixa do operador:', err);
        }
      };
      fetchRegister();
    } else {
      localStorage.removeItem('currentOperator');
      setCashRegister(null);
    }
  }, [operator?.id]);

  const logoutOperator = () => {
    setOperator(null);
    setCashRegister(null);
  };

  return (
    <ShiftContext.Provider
      value={{
        operator,
        cashRegister,
        setOperator,
        setCashRegister,
        isLoading,
        logoutOperator,
        refreshShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift(): ShiftContextType {
  const context = useContext(ShiftContext);
  // Retorna contexto vazio quando usado fora do ShiftProvider (ex: painel admin).
  // Evita o crash "useShift must be used within a ShiftProvider".
  if (context === undefined) {
    return {
      operator: null,
      cashRegister: null,
      setOperator: () => {},
      setCashRegister: () => {},
      isLoading: false,
      logoutOperator: () => {},
      refreshShift: async () => {},
    };
  }
  return context;
}
