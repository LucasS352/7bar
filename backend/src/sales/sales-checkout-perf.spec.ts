import { BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { computeSaleFingerprint } from './sales-idempotency.helper';

describe('SalesService checkout query batching', () => {
  it('preloads FIFO lots, batches product/lot updates and creates saleItems via createMany', async () => {
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
        update: jest.fn().mockResolvedValue({}),
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
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      saleItemModifier: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      stockLotConsumption: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
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
    expect(db.sale.findUnique).toHaveBeenCalledWith({
      where: { id: '11111111-1111-4111-8111-111111111111' },
      select: { id: true },
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1); // apenas lockProducts em batch
    expect(tx.stockLot.findMany).toHaveBeenCalledTimes(1);
    expect(tx.stockLot.findFirst).not.toHaveBeenCalled();
    expect(tx.stockLot.update).not.toHaveBeenCalled(); // batched em $executeRaw
    expect(tx.product.updateMany).not.toHaveBeenCalled(); // batched em $executeRaw
    expect(tx.saleItem.create).not.toHaveBeenCalled();
    expect(tx.saleItem.createMany).toHaveBeenCalledTimes(1);
    expect(tx.stockLotConsumption.createMany).toHaveBeenCalledTimes(1);
    expect(tx.sale.findUnique).not.toHaveBeenCalled();
    expect(tx.tenantPaymentMethod.findMany).not.toHaveBeenCalled();
    expect(tx.saleDeliveryJob.createMany).toHaveBeenCalledTimes(1);
    expect(tx.saleDeliveryJob.create).not.toHaveBeenCalled();
    expect(productsService.invalidateCache).toHaveBeenCalledWith('tenant-1');
  });

  it('rejeita falta de estoque antes de gravar venda ou consumir numeração de NFC-e', async () => {
    const productLow = {
      id: 'p-low',
      name: 'Gelo 5kg',
      unit: 'UN',
      isComposite: false,
      ncm: null,
      cest: null,
      origem: 0,
      priceCost: 5,
      priceSell: 10,
      stock: 1,
      grupoTributacao: null,
      category: null,
      modifierGroups: [],
    };

    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      cashRegister: { findUnique: jest.fn().mockResolvedValue({ id: 'reg-1', status: 'open' }) },
      tenantSettings: { findUnique: jest.fn().mockResolvedValue({ allowNegativeStock: false }) },
      product: { findMany: jest.fn().mockResolvedValue([productLow]), updateMany: jest.fn(), update: jest.fn() },
      stockLot: { findMany: jest.fn().mockResolvedValue([]) },
      numeracaoNfce: { upsert: jest.fn() },
      sale: { create: jest.fn(), findFirst: jest.fn() },
    };

    const db = {
      sale: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((cb: any) => cb(tx)),
    };

    const svc = new SalesService(
      { getTenantClient: async () => db } as any,
      {} as any,
      {} as any,
      { get: () => ({ userId: 'op-1', tenantId: 'tenant-1', databaseUrl: 'mysql://localhost/db' }) } as any,
      { invalidateCache: jest.fn() } as any,
      {} as any,
      {} as any,
    );

    await expect(
      svc.checkout({
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
        cashRegisterId: 'reg-1',
        operatorId: 'op-1',
        emitirNfce: false,
        items: [{ productId: 'p-low', quantity: 2, priceUnit: 10 }],
        payments: [{ method: 'dinheiro', value: 20 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.sale.create).not.toHaveBeenCalled();
    expect(tx.numeracaoNfce.upsert).not.toHaveBeenCalled();
  });

  it('carrega detalhes completos apenas quando o pre-check por select id encontra replay', async () => {
    const payload = {
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
      operatorId: 'op-1',
      emitirNfce: false,
      items: [{ productId: 'p-a', quantity: 1, priceUnit: 5 }],
      payments: [{ method: 'dinheiro', value: 5 }],
    };
    const fullExisting = {
      id: payload.idempotencyKey,
      requestFingerprint: computeSaleFingerprint(payload),
      total: 5,
      items: [],
      payments: [{ method: 'dinheiro', value: 5 }],
      customer: null,
    };

    const db = {
      sale: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: payload.idempotencyKey })
          .mockResolvedValueOnce(fullExisting),
      },
      $transaction: jest.fn(),
    };

    const svc = new SalesService(
      { getTenantClient: async () => db } as any,
      {} as any,
      {} as any,
      { get: () => ({ userId: 'op-1', tenantId: 'tenant-1', databaseUrl: 'mysql://localhost/db' }) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const res = await svc.checkout(payload);
    expect(res).toBe(fullExisting);
    expect(db.sale.findUnique).toHaveBeenCalledTimes(2);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
