import { api } from './api';
import { markCancelledComandaSaleRejected, type OfflineSale } from './db';

/** Resolve somente uma recusa definitiva de comanda cancelada, mantendo o registro local. */
export async function reconcileCancelledComandaCheckout(sale: Pick<OfflineSale, 'localId' | 'tenantId' | 'comandaId'>): Promise<boolean> {
  if (!sale.comandaId) return false;
  try {
    const response = await api.get<{ id: string; status: string }>(`/v1/comandas/${encodeURIComponent(sale.comandaId)}`, {
      timeout: 6000,
      expectedTenantId: sale.tenantId,
    } as never);
    if (response.data.id !== sale.comandaId || response.data.status !== 'cancelled') return false;
    return markCancelledComandaSaleRejected(sale.localId, sale.tenantId);
  } catch {
    return false;
  }
}
