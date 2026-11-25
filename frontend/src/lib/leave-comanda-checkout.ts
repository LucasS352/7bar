import { useCartStore } from '@/store/cart';
import { getOfflineSale } from './db';

/** Retira somente a cópia de cobrança do caixa. Não altera a comanda no servidor. */
export async function leaveComandaCheckout(tenantId: string, operatorId: string): Promise<void> {
  const cart = useCartStore.getState();
  const scope = `7bar-cart-v2:${tenantId}:${operatorId}`;
  if (!tenantId || !operatorId || cart.scope !== scope) throw new Error('Operador alterado. Reabra o caixa antes de continuar.');
  if (cart.isOperationLocked) throw new Error('Aguarde a confirmação da cobrança antes de sair.');
  if (!cart.activeComandaId) return;
  const operationId = cart.cartOperationId;
  const comandaId = cart.activeComandaId;
  cart.setOperationLocked(true);
  try {
    const submitted = await getOfflineSale(tenantId, operationId);
    if (submitted) throw new Error('Esta cobrança já foi enviada ou está pendente. Confira as pendências antes de sair para evitar cobrança duplicada.');
    const current = useCartStore.getState();
    if (current.scope !== scope || current.cartOperationId !== operationId || current.activeComandaId !== comandaId) {
      throw new Error('O carrinho mudou durante a conferência. Tente novamente.');
    }
    const items = current.items.filter(item => !item.fromComanda);
    useCartStore.setState({ items, total: Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100,
      activeComandaId: null, activeComandaNumber: null, cartOperationId: crypto.randomUUID(), isOperationLocked: false });
  } finally {
    const current = useCartStore.getState();
    if (current.scope === scope && current.cartOperationId === operationId) current.setOperationLocked(false);
  }
}
