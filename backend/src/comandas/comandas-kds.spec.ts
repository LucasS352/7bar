import { ComandasService } from './comandas.service';

describe('Lançamentos KDS preservam estoque e valores de comandas', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  function setup(enabled: boolean, product: any) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'c', status: 'open' }]),
      product: {
        findMany: jest.fn().mockResolvedValue([{
          ...product,
          modifierGroups: (product.modifierGroups || []).map((group: any) => ({ ...group,
            options: group.options.map((option: any) => ({ ...option, componentProductId: option.componentProductId || option.componentProduct?.id })),
          })),
        }]),
        findUnique: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryLog: { create: jest.fn() },
      comandaItem: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ totalPrice: 30 }]),
      },
      comanda: { update: jest.fn() },
    };
    const db = {
      comanda: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'c', number: '04', status: 'open' }),
      },
      tenantSettings: {
        findFirst: async () => ({ allowNegativeStock: false }),
      },
      $transaction: (fn: any) => fn(tx),
    };
    const service = new ComandasService(
      { getTenantClient: async () => db } as any,
      { get: () => ({ tenantId: 't' }) } as any,
      { invalidateCache: jest.fn() } as any,
      { syncProductStock: jest.fn() } as any,
      { config: async () => ({ enabled, kdsEnabled: enabled, carvoariaEnabled: false }) } as any,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'c' } as any);
    return { service, tx };
  }
  const product = {
    id: 'p',
    name: 'Porção',
    priceSell: 15,
    isComposite: false,
    requiresKitchen: true,
  };
  it('recusa lançamento se o caixa encerrou a comanda após a leitura inicial', async () => {
    const { service, tx } = setup(true, product);
    tx.$queryRaw.mockResolvedValue([{ id: 'c', status: 'closed' }]);
    await expect(service.addItems('c', [{ productId: 'p', quantity: 1 }])).rejects.toThrow('mudou de estado');
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.comandaItem.create).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'preserva preço, estoque e auditoria com KDS ativo=%s',
    async (enabled) => {
      const { service, tx } = setup(enabled, product);
      await service.addItems('c', [
        {
          productId: 'p',
          quantity: 2,
          notes: 'Sem sal',
          createdById: 'garcom',
        },
      ]);
      const data = tx.comandaItem.create.mock.calls[0][0].data;
      expect(Number(data.totalPrice)).toBe(30);
      expect(Number(data.unitPrice)).toBe(15);
      expect(data.stockDeducted).toBe(true);
      expect(data.notes).toBe('Sem sal');
      expect(data.createdById).toBe('garcom');
      expect(
        Number(tx.product.updateMany.mock.calls[0][0].data.stock.decrement),
      ).toBe(2);
      expect(tx.inventoryLog.create).toHaveBeenCalledTimes(1);
      expect(data.kdsStatus).toBe(enabled ? 'PENDING' : undefined);
      expect(tx.comanda.update.mock.calls[0][0].data.status).toBeUndefined();
    },
  );
  it('produto antigo sem flag e sem check continua fora da cozinha', async () => {
    const { service, tx } = setup(true, { ...product, requiresKitchen: false });
    await service.addItems('c', [{ productId: 'p', quantity: 1 }]);
    expect(
      tx.comandaItem.create.mock.calls[0][0].data.kdsStatus,
    ).toBeUndefined();
  });
  it('ingredientes opcionais não tornam o produto composto nem exigem seleções', async () => {
    const { service, tx } = setup(true, {
      ...product,
      preparationIngredients: 'Batata, sal',
    });
    await service.addItems('c', [{ productId: 'p', quantity: 1 }]);
    expect(tx.comandaItem.create.mock.calls[0][0].data.kdsStatus).toBe(
      'PENDING',
    );
    expect(tx.product.updateMany.mock.calls[0][0].where.id).toBe('p');
  });
  it.each([false, true])('produto composto preserva ingrediente e preço, KDS=%s', async (enabled) => {
    const { service, tx } = setup(enabled, {
      ...product,
      isComposite: true,
      modifierGroups: [
        {
          id: 'g',
          name: 'Sabor',
          minSelected: 1,
          maxSelected: 1,
          options: [
            {
              id: 'o',
              name: 'Queijo',
              quantity: 100,
              priceAdjustment: 2,
              componentProduct: {
                id: 'queijo',
                name: 'Queijo',
                volumeCapacity: 1000,
              },
            },
          ],
        },
      ],
    });
    await service.addItems('c', [
      { productId: 'p', quantity: 2, modifiers: [{ optionId: 'o' }] },
    ]);
    const data = tx.comandaItem.create.mock.calls[0][0].data;
    expect(Number(data.totalPrice)).toBe(34);
    expect(data.kdsStatus).toBe(enabled ? 'PENDING' : undefined);
    expect(Number(data.modifiers.create[0].consumedQuantity)).toBeCloseTo(0.2);
    expect(tx.product.updateMany.mock.calls[0][0].where.id).toBe('queijo');
  });
  it.each([
    { modifiers: [] }, { modifiers: [{ optionId: 'desconhecida' }] },
    { modifiers: [{ optionId: 'o' }, { optionId: 'o' }] },
  ])('recusa adicionais inválidos sem baixar estoque: %j', async ({ modifiers }) => {
    const { service, tx } = setup(true, {
      ...product, isComposite: true,
      modifierGroups: [{ id: 'g', name: 'Sabor', minSelected: 1, maxSelected: 1,
        options: [{ id: 'o', quantity: 1, priceAdjustment: 0, componentProduct: { id: 'ingrediente', name: 'Ingrediente' } }],
      }],
    });
    await expect(service.addItems('c', [{ productId: 'p', quantity: 1, modifiers }])).rejects.toThrow();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.comandaItem.create).not.toHaveBeenCalled();
  });
});
