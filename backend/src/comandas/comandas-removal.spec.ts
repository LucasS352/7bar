import { ComandasService } from './comandas.service';

describe('Remoção de itens da comanda pelo caixa', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  function setup(status = 'open', modifiers: any[] = [], stockDeducted = true) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'c', status: 'open' }]),
      product: { update: jest.fn() },
      inventoryLog: { create: jest.fn() },
      comandaItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 'i', status: 'active', productId: 'p', quantity: 2, stockDeducted, modifiers,
          product: { id: 'p', name: 'Porção' } }),
        update: jest.fn(),
        findMany: jest
          .fn()
          .mockResolvedValue([{ totalPrice: 12.5 }, { totalPrice: 7.25 }]),
      },
      comanda: { update: jest.fn() },
      comandaActionAuthorization: {
        findFirst: jest.fn().mockResolvedValue({ id: 'auth', authorizationType: 'manager_pin', authorizedByOperatorId: 'mgr', authorizedByName: 'Gerente' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      comandaAssetReservation: { deleteMany: jest.fn() },
      comandaAuditEvent: { create: jest.fn() },
    };
    const db = {
      comanda: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c', number: '04', status }),
      },
      comandaItem: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'i',
            productId: 'p',
            quantity: 2,
            stockDeducted,
            modifiers,
          product: { id: 'p', name: 'Porção' }, status: 'active',
          }),
      },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    const service = new ComandasService(
      { getTenantClient: async () => db } as any,
      { get: () => ({ tenantId: 't' }) } as any,
      { invalidateCache: jest.fn() } as any,
      {} as any,
      { invalidateQueue: jest.fn() } as any,
    );
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'c', status: 'open' } as any);
    return { tx, db, service };
  }
  it('recalcula o total e estorna a quantidade inteira, sem fechar a comanda', async () => {
    const { service, tx, db } = setup();
    await expect(service.removeItem('c', 'i', 'a'.repeat(40), 'Lançamento duplicado', { operatorId: 'waiter', name: 'João' })).resolves.toMatchObject({
      id: 'c',
      status: 'open',
    });
    expect(db.comandaItem.findFirst.mock.calls[0][0].where).toEqual({
      id: 'i',
      comandaId: 'c',
    });
    expect(
      Number(tx.product.update.mock.calls[0][0].data.stock.increment),
    ).toBe(2);
    expect(tx.comandaItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'i' }, data: expect.objectContaining({ status: 'removed', removalReason: 'Lançamento duplicado' }) }));
    expect(tx.comandaAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'item_removed', authorizedByName: 'Gerente' }) }));
    expect(Number(tx.comanda.update.mock.calls[0][0].data.total)).toBe(19.75);
    expect(tx.comanda.update.mock.calls[0][0].data.status).toBeUndefined();
  });
  it('estorna ingredientes pelo snapshot de consumo do produto composto', async () => {
    const { service, tx } = setup('open', [
      { componentProductId: 'ingrediente', consumedQuantity: 0.3 },
    ]);
    await service.removeItem('c', 'i', 'a'.repeat(40), 'Produto lançado errado', { operatorId: 'waiter', name: 'João' });
    expect(tx.product.update.mock.calls[0][0].where.id).toBe('ingrediente');
    expect(
      Number(tx.product.update.mock.calls[0][0].data.stock.increment),
    ).toBe(0.3);
  });
  it('não adiciona estoque quando o lançamento original não foi debitado', async () => {
    const { service, tx } = setup('open', [], false);
    await service.removeItem('c', 'i', 'a'.repeat(40), 'Produto lançado errado', { operatorId: 'waiter', name: 'João' });
    expect(tx.product.update).not.toHaveBeenCalled();
  });
  it.each(['waiting_payment', 'closed', 'cancelled'])(
    'recusa remoção em %s sem alterar dados',
    async (status) => {
      const { service, db } = setup(status);
      await expect(service.removeItem('c', 'i', 'a'.repeat(40), 'Produto lançado errado', { operatorId: 'waiter', name: 'João' })).rejects.toThrow();
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('recusa item de outra comanda', async () => {
    const { service, db } = setup();
    db.comandaItem.findFirst.mockResolvedValue(null as any);
    await expect(service.removeItem('c', 'outro-item', 'a'.repeat(40), 'Produto lançado errado', { operatorId: 'waiter', name: 'João' })).rejects.toThrow(
      'Item ativo não encontrado',
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('não remove sem uma autorização de uso único válida', async () => {
    const { service, tx } = setup();
    tx.comandaActionAuthorization.findFirst.mockResolvedValue(null);
    await expect(service.removeItem('c', 'i', 'a'.repeat(40), 'Produto lançado errado', { operatorId: 'waiter', name: 'João' })).rejects.toThrow('autorização por PIN');
    expect(tx.comandaItem.update).not.toHaveBeenCalled();
    expect(tx.product.update).not.toHaveBeenCalled();
  });
});
