import { api, apiGet } from './api';

/** Never enable timed checkout/replay against the old non-transactional server/schema. */
export async function sendCheckout(body: any, tenantId: string, operatorId: string) {
  const expected = { expectedTenantId: tenantId, expectedOperatorId: operatorId };
  let capability;
  try {
    capability = await apiGet(`/sales/checkout-capabilities?_t=${Date.now()}`, {
      ...expected, headers: { 'Cache-Control': 'no-store' },
    } as any);
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
  }
  if (capability?.data?.protocol !== 2) {
    const error = new Error('Servidor/banco ainda não está preparado para recuperação segura. Pedido preservado; concluir atualização pelo Sys-Init.');
    Object.assign(error, { code: 'CHECKOUT_PROTOCOL_UNAVAILABLE' });
    throw error;
  }
  return api.post('/sales/checkout', body, { ...expected, timeout: 10_000 } as any);
}
