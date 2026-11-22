import { SalesService } from './sales.service';

describe('SalesService checkout query batching', () => {
  it('preloads active FIFO stock lots in a single batch query and avoids redundant trailing queries', async () => {
    const productA = {
      id: 'p-a',
      name: 'Cerveja A',
      unit: 'UN',
      isComposite: false,
      ncm: '22030000',
      cest: null,
      origem: 0,
      priceCost: 2,
      priceSell: 5,
      stock: 20,
      grupoTributacao: null,
      category: null,
      modifierGroups: [],
    };
    const productB = { ...productA, id: 'p-b', name: 'Cerveja B' };

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      cashRegister: { findUnique: jest.fn().mockResolvedValue({ id: 'reg-1', status: 'open' }) },
      tenantSettings: { findUnique: jest.fn().mockResolvedValue({ allowNegativeStock: false }) },
      product: {
        findMany: jest.fn().mockResolvedValue([productA, productB]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockLot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'lot-a1', productId: 'p-a', remaining: 10, costPrice: 2 },
          { id: 'lot-b1', productId: 'p-b', remaining: 10, costPrice: 2 },
        ]),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      tenantPaymentMethod: { findMany: jest.fn().mockResolvedValue([]) },
      operator: { findUnique: jest.fn().mockResolvedValue({ id: 'op-1' }) },
      sale: {
        findFirst: jest.fn().mockResolvedValue({ code: 10 }),
        create: jest.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          code: 11,
          emitirNfce: false,
          total: 10,
          payments: [{ method: 'dinheiro', value: 10, troco: 0 }],
          customer: null,
        }),
        findUnique: jest.fn(),
      },
      saleItem: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: `si-${data.productId}`, ...data, modifiers: [], lotConsumptions: [] }),
        ),
      },
      inventoryLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      saleDeliveryJob: { createMany: jest.fn().mockResolvedValue({ count: 1 }), create: jest.fn() },
    };

    const db = {
      sale: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };

    const productsService = { invalidateCache: jest.fn() };
    const svc = new SalesService(
      { getTenantClient: async () => db } as any,
      {} as any,
      {} as any,
      { get: () => ({ userId: 'op-1', tenantId: 'tenant-1', databaseUrl: 'mysql://localhost/db' }) } as any,
      productsService as any,
      {} as any,
      {} as any,
    );

    const res = await svc.checkout({
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      cashRegisterId: 'reg-1',
      operatorId: 'op-1',
      emitirNfce: false,
      items: [
        { productId: 'p-a', quantity: 1, priceUnit: 5 },
        { productId: 'p-b', quantity: 1, priceUnit: 5 },
      ],
      payments: [{ method: 'dinheiro', value: 10 }],
    });

    expect(res.items).toHaveLength(2);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.stockLot.findMany).toHaveBeenCalledTimes(1);
    expect(tx.stockLot.findFirst).not.toHaveBeenCalled();
    expect(tx.sale.findUnique).not.toHaveBeenCalled();
    expect(tx.tenantPaymentMethod.findMany).not.toHaveBeenCalled();
    expect(tx.saleDeliveryJob.createMany).toHaveBeenCalledTimes(1);
    expect(tx.saleDeliveryJob.create).not.toHaveBeenCalled();
    expect(productsService.invalidateCache).toHaveBeenCalledWith('tenant-1');
  });
});
