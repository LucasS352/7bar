/** Cross-tab lock, automatically released on F5/crash. Never guess that an active sender died. */
export async function withSaleOperationLock<T>(tenantId: string, localId: string, work: () => Promise<T>): Promise<T> {
  if (!tenantId || tenantId === 'unknown') throw new Error('Loja não identificada. Selecione a loja antes de vender.');
  if (!navigator.locks) throw new Error('Este navegador não suporta o bloqueio seguro de vendas. Utilize um navegador atualizado em HTTPS.');
  return navigator.locks.request(`7bar-sale:${tenantId}:${localId}`, { ifAvailable: true }, async lock => {
    if (!lock) throw new Error('Esta operação já está sendo enviada em outra aba. Aguarde a confirmação.');
    return work();
  });
}
