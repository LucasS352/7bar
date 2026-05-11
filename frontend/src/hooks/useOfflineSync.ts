/**
 * ============================================================
 *  useOfflineSync.ts — Hook de Sincronização Offline
 *  7bar PDV — PWA Contingência
 * ============================================================
 *
 *  Responsabilidades:
 *  1. Monitorar status de conexão (online / offline)
 *  2. Ao voltar online, detectar vendas PENDING no IndexedDB
 *  3. Enviar cada venda ao backend NestJS (/api/sales/checkout)
 *  4. Marcar como SYNCED ou ERROR conforme resultado
 *  5. Expor estado para o componente ConnectionStatus
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  getPendingSales,
  markSaleSynced,
  markSaleError,
  countPendingSales,
  type OfflineSale,
} from '@/lib/db';

// ── Tipos exportados ─────────────────────────────────────────────────────────

export interface OfflineSyncState {
  /** true quando navigator.onLine === true */
  isOnline: boolean;
  /** Quantidade de vendas aguardando sincronização */
  pendingCount: number;
  /** true enquanto o processo de sync está rodando */
  isSyncing: boolean;
  /** Dispara o sync manualmente (útil para botão "Sincronizar agora") */
  syncNow: () => Promise<void>;
}

// ── Mapa de método → tPag SEFAZ (espelha o backend) ─────────────────────────
const TPAG_MAP: Record<string, string> = {
  dinheiro: '01',
  credito:  '03',
  debito:   '04',
  pix:      '17',
  outros:   '99',
};

// ── Hook principal ────────────────────────────────────────────────────────────

export function useOfflineSync(): OfflineSyncState {
  const [isOnline,     setIsOnline]     = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing,    setIsSyncing]    = useState<boolean>(false);

  // Ref para evitar sincronizações paralelas
  const syncInProgress = useRef<boolean>(false);

  // ── Atualiza contagem de pendentes ───────────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingSales();
    setPendingCount(count);
  }, []);

  // ── Serializa uma OfflineSale para o formato esperado pelo backend ───────
  const buildCheckoutPayload = (sale: OfflineSale) => ({
    // Itens com snapshot fiscal completo
    items: sale.items.map((item) => ({
      productId: item.productId,
      quantity:  item.quantity,
      priceUnit: item.priceUnit,
      // Snapshot fiscal — enviado para que o backend não recalcule
      fiscalSnapshot: {
        productName: item.productName,
        unit:        item.unit,
        discount:    item.discount,
        subtotal:    item.subtotal,
        ncm:         item.ncm,
        cest:        item.cest,
        cfop:        item.cfop,
        origem:      item.origem,
        csosn:       item.csosn,
        cstIcms:     item.cstIcms,
        aliqIcms:    item.aliqIcms,
        cstPis:      item.cstPis,
        aliqPis:     item.aliqPis,
        cstCofins:   item.cstCofins,
        aliqCofins:  item.aliqCofins,
      },
    })),

    // Pagamentos com tPag SEFAZ
    payments: sale.payments.map((p) => ({
      method: p.method,
      tPag:   p.tPag ?? TPAG_MAP[p.method] ?? '99',
      value:  p.value,
      troco:  p.troco,
    })),

    // Vendas offline NUNCA emitem NFC-e na sincronização
    emitirNfce: false,

    // Flag especial: informa ao backend que é uma venda de contingência
    offlineContingency: true,
    offlineCreatedAt:   sale.createdAt,
    localId:            sale.localId,

    operatorId:     sale.operatorId,
    cashRegisterId: sale.cashRegisterId,

    customerCpf:  sale.customerCpf,
    customerName: sale.customerName,
  });

  // ── Processo de sincronização ─────────────────────────────────────────────
  const syncPendingSales = useCallback(async () => {
    // Guarda contra execuções paralelas
    if (syncInProgress.current) return;
    
    if (!navigator.onLine) {
      await refreshPendingCount();
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingSales();

      if (pending.length === 0) {
        return;
      }

      toast.info(`Sincronizando ${pending.length} venda(s) offline...`, {
        id: '7bar-sync',
        duration: 5000,
      });

      let successCount = 0;
      let errorCount   = 0;

      // Processa uma venda por vez para evitar sobrecarga
      for (const sale of pending) {
        try {
          const payload  = buildCheckoutPayload(sale);
          const response = await api.post<{ id: string }>('/sales/checkout', payload);

          await markSaleSynced(sale.localId, response.data.id);
          successCount++;
        } catch (err: unknown) {
          const message = err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message
              ?? 'Erro desconhecido';

          await markSaleError(sale.localId, message);
          errorCount++;
        }
      }

      // Feedback consolidado
      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} venda(s) sincronizada(s) com sucesso!`, {
          id: '7bar-sync',
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(
          `${successCount} sincronizada(s), ${errorCount} com erro. Verifique o histórico.`,
          { id: '7bar-sync' }
        );
      } else if (errorCount > 0) {
        toast.error(
          `Falha ao sincronizar ${errorCount} venda(s). Tente novamente.`,
          { id: '7bar-sync' }
        );
      }
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  // ── Listeners de conexão ─────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Conexão restaurada!', { duration: 3000 });
      // Dispara sync automaticamente ao reconectar
      await syncPendingSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Você está offline. Vendas serão salvas localmente.', {
        duration: 5000,
        id: '7bar-offline',
      });
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verifica pendentes ao montar (caso app abra com vendas acumuladas)
    refreshPendingCount();

    // Se iniciar online, verifica se há pendentes do dia anterior
    if (navigator.onLine) {
      syncPendingSales();
    }

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingSales, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow: syncPendingSales,
  };
}
