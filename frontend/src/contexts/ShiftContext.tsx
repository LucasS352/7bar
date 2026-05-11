import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Operator {
  id: string;
  name: string;
  role: string;
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
  refreshShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load operator from session storage and check for global open shifts
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // 1. Tenta recuperar operador da sessão local
        const savedOp = sessionStorage.getItem('currentOperator');
        let currentOp = savedOp ? JSON.parse(savedOp) : null;

        // 2. SEMPRE verifica no servidor se há um caixa aberto (Verdade absoluta)
        const res = await api.get('/cash-registers/current');
        
        if (res.data) {
          // Se existe um caixa aberto, e não temos operador ou o operador é diferente, 
          // nós assumimos o operador que abriu o caixa para manter a consistência.
          setCashRegister(res.data);
          
          // Se não tivermos o operador no sessionStorage, buscamos os dados dele
          if (!currentOp) {
             const opRes = await api.get(`/operators/${res.data.operatorId}`);
             currentOp = opRes.data;
          }
          setOperator(currentOp);
          sessionStorage.setItem('currentOperator', JSON.stringify(currentOp));
        } else if (currentOp) {
          // Se não tem caixa aberto no banco mas tem operador salvo, mantemos o operador
          // mas limpamos o caixa (caso ele tenha sido fechado em outra aba)
          setOperator(currentOp);
          setCashRegister(null);
        }
      } catch (err) {
        console.error('Erro na inicialização do turno:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Polling a cada 30s para detectar fechamentos feitos em outra aba/dispositivo
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/cash-registers/current');
        setCashRegister(res.data || null);
      } catch { /* silencia erros de rede no polling */ }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (operator) {
      sessionStorage.setItem('currentOperator', JSON.stringify(operator));
    } else {
      sessionStorage.removeItem('currentOperator');
    }
  }, [operator]);

  const refreshShift = async () => {
    try {
      const res = await api.get('/cash-registers/current');
      const register = res.data || null;
      setCashRegister(register);

      if (register && operator) {
        localStorage.setItem(`pdvpro_cached_register_${operator.id}`, JSON.stringify(register));
      } else if (operator) {
        localStorage.removeItem(`pdvpro_cached_register_${operator.id}`);
      }
    } catch (err) {
      console.error('Erro ao buscar caixa atual:', err);
    }
  };

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
        refreshShift
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
