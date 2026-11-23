import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { reportPeriod } from './reports.period';
import { ReportsService } from './reports.service';
import { TenantContextService } from '../prisma/tenant-context.service';

describe('Report periods', () => {
  it.each([
    [undefined, '2026-01-01'],
    [['2026-01-01'], '2026-01-01'],
    ['2026-02-29', '2026-03-01'],
    ['2026-04-31', '2026-05-01'],
    ['2026-1-01', '2026-01-01'],
    ['2026-01-02', '2026-01-01'],
    ['2026-01-01', '2026-04-03'],
    ['2026-01-01T00:00:00Z', '2026-01-01'],
  ])('rejects invalid or excessive range %s -> %s', (start, end) => {
    expect(() => reportPeriod(start, end)).toThrow(BadRequestException);
  });

  it('includes the last millisecond and crosses year boundaries at UTC-03', () => {
    const period = reportPeriod('2025-12-31', '2026-01-01');
    expect(period.start.toISOString()).toBe('2025-12-31T03:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2026-01-02T03:00:00.000Z');
    expect(period.days).toBe(2);
  });

  it('accepts leap days and the inclusive 92-day limit', () => {
    expect(reportPeriod('2024-02-29', '2024-02-29').days).toBe(1);
    expect(reportPeriod('2026-01-01', '2026-04-02').days).toBe(92);
  });
});

describe('Reports read model (sales, profit, ranking & adega insights)', () => {
  const decimal = (v: string) => new Prisma.Decimal(v);
  const context = new TenantContextService();
  let prisma: any;
  let manager: any;
  let service: ReportsService;
  let productsServiceMock: { invalidateCache: jest.Mock };
  let queryQueue: any[];

  beforeEach(() => {
    queryQueue = [];
    productsServiceMock = { invalidateCache: jest.fn() };
    prisma = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { _all: 3 },
          _sum: { total: decimal('100.01'), discount: decimal('9.99'), addition: decimal('2.00') },
        }),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cat-1', name: 'Cervejas' },
          { id: 'cat-2', name: 'Destilados' },
        ]),
      },
      product: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([{ id: 'p2' }]),
        update: jest.fn().mockResolvedValue({ id: 'p2', priceCost: decimal('3.50') }),
      },
      $transaction: jest.fn(async (queries) => Promise.all(queries)),
      $queryRaw: jest.fn().mockImplementation(() => Promise.resolve(queryQueue.shift() ?? [])),
    };
    manager = { getTenantClient: jest.fn().mockResolvedValue(prisma) };
    service = new ReportsService(manager, context, productsServiceMock as any);
  });

  const run = <T>(fn: () => Promise<T>) =>
    context.run({ tenantId: 'tenant-a', databaseUrl: 'test-only', userId: 'admin' }, fn);

  it('computes real profit (net revenue minus item cost) and cost coverage inside RepeatableRead', async () => {
    queryQueue = [
      // costRows
      [
        {
          itemsSubtotal: decimal('108.00'),
          totalCost: decimal('60.01'),
          historicalCostRevenue: decimal('80.00'),
          fallbackCostRevenue: decimal('18.00'),
          uncostedRevenue: decimal('10.00'),
          uncostedItemsCount: 1n,
        },
      ],
      // topProductsRows
      [
        {
          productId: 'p1',
          name: 'Heineken Long Neck 330ml',
          unit: 'UN',
          imageUrl: '/uploads/heineken.png',
          quantity: decimal('12.000'),
          itemSubtotal: decimal('108.00'),
          totalCost: decimal('60.01'),
        },
      ],
      // dailySalesRows
      [{ date: '2026-01-01', revenue: decimal('100.01'), transactions: 3n }],
      // dailyCostRows
      [{ date: '2026-01-01', totalCost: decimal('60.01') }],
      // uncostedRows
      [
        {
          productId: 'p2',
          name: 'Gelo 5kg',
          unit: 'UN',
          imageUrl: '   ',
          quantity: decimal('2.000'),
          itemSubtotal: decimal('10.00'),
        },
      ],
    ];

    const result = await run(() => service.sales('2026-01-01', '2026-01-02'));

    expect(result.summary).toMatchObject({
      revenue: '100.01',
      totalCost: '60.01',
      grossProfit: '40.00',
      marginPercent: '40.00',
      markupPercent: '66.66',
      itemsSubtotal: '108.00',
      saleDiscounts: '9.99',
      saleAdditions: '2.00',
      transactions: 3,
      averageTicket: '33.34',
      averageProfitPerSale: '13.33',
      costCoveragePercent: '90.74',
      uncostedRevenue: '10.00',
      uncostedItemsCount: 1,
    });
    expect(result.uncostedProducts).toEqual([
      {
        productId: 'p2',
        name: 'Gelo 5kg',
        unit: 'UN',
        imageUrl: null,
        quantity: '2.000',
        itemSubtotal: '10.00',
      },
    ]);
    expect(result.products[0]).toEqual({
      productId: 'p1',
      name: 'Heineken Long Neck 330ml',
      unit: 'UN',
      imageUrl: '/uploads/heineken.png',
      quantity: '12.000',
      itemSubtotal: '108.00',
      totalCost: '60.01',
      grossProfit: '47.99',
      marginPercent: '44.44',
    });
    expect(result.daily[0]).toMatchObject({
      date: '2026-01-01',
      revenue: '100.01',
      totalCost: '60.01',
      grossProfit: '40.00',
      marginPercent: '40.00',
      transactions: 3,
    });
    expect(manager.getTenantClient).toHaveBeenCalledWith('tenant-a', 'test-only');
    expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
  });

  it('returns clean empty state without division by zero', async () => {
    prisma.sale.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { total: null, discount: null, addition: null },
    });
    const result = await run(() => service.sales('2026-01-01', '2026-01-01'));
    expect(result.summary.revenue).toBe('0.00');
    expect(result.summary.totalCost).toBe('0.00');
    expect(result.summary.grossProfit).toBe('0.00');
    expect(result.summary.marginPercent).toBeNull();
    expect(result.summary.costCoveragePercent).toBe('100.00');
    expect(result.products).toEqual([]);
  });

  it('builds detailed product ranking with profit share, cost source, and stock alerts', async () => {
    queryQueue = [
      // totalsRows
      [
        {
          distinctProducts: 2n,
          totalUnitsSold: decimal('15.000'),
          totalRevenue: decimal('200.00'),
          totalCost: decimal('90.00'),
          uncostedInPeriodCount: 1n,
          uncostedInPeriodRevenue: decimal('50.00'),
        },
      ],
      // rankingRows
      [
        {
          productId: 'p1',
          name: 'Whisky Red Label 1L',
          unit: 'UN',
          imageUrl: '/uploads/whisky.jpg',
          categoryId: 'cat-2',
          categoryName: 'Destilados',
          salesCount: 5n,
          quantity: decimal('5.000'),
          itemSubtotal: decimal('150.00'),
          totalCost: decimal('90.00'),
          grossProfit: decimal('60.00'),
          historicalRev: decimal('150.00'),
          fallbackRev: decimal('0.00'),
          uncostedRev: decimal('0.00'),
          currentStock: decimal('2.000'),
          minStock: decimal('4.000'),
          isComposite: false,
        },
        {
          productId: 'p2',
          name: 'Gelo 5kg',
          unit: 'UN',
          categoryId: 'cat-1',
          categoryName: 'Cervejas',
          salesCount: 4n,
          quantity: decimal('10.000'),
          itemSubtotal: decimal('50.00'),
          totalCost: decimal('0.00'),
          grossProfit: decimal('50.00'),
          historicalRev: decimal('0.00'),
          fallbackRev: decimal('0.00'),
          uncostedRev: decimal('50.00'),
          currentStock: decimal('0.000'),
          minStock: null,
          isComposite: false,
        },
      ],
    ];

    const result = await run(() =>
      service.productsRanking({
        startDate: '2026-01-01',
        endDate: '2026-01-07',
        sortBy: 'profit',
        limit: '999', // deve travar em 100
      }),
    );

    expect(result.filters.limit).toBe(100);
    expect(result.totals.totalGrossProfit).toBe('110.00');
    expect(result.totals.averageMarginPercent).toBe('55.00');
    expect(result.totals.uncostedInPeriodCount).toBe(1);
    expect(result.totals.uncostedInPeriodRevenue).toBe('50.00');
    expect(result.totals.uncostedCatalogCount).toBe(4);
    expect(result.items[0]).toMatchObject({
      rank: 1,
      productId: 'p1',
      imageUrl: '/uploads/whisky.jpg',
      costSource: 'historical',
      stockAlert: 'low',
      avgSalePrice: '30.00',
      avgUnitCost: '18.00',
      marginPercent: '40.00',
      revenueSharePercent: '75.00',
      profitSharePercent: '54.55',
    });
    expect(result.items[1]).toMatchObject({
      rank: 2,
      productId: 'p2',
      imageUrl: null,
      costSource: 'untracked',
      costCoveragePercent: '0.00',
      stockAlert: 'out',
    });
  });

  it('rejects invalid sortBy in productsRanking', async () => {
    await expect(
      run(() =>
        service.productsRanking({
          startDate: '2026-01-01',
          endDate: '2026-01-07',
          sortBy: 'DROP TABLE sales',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(manager.getTenantClient).not.toHaveBeenCalled();
  });

  it('generates actionable adega insights (peak hours, stockout, uncosted items, slow capital)', async () => {
    prisma.sale.aggregate.mockResolvedValue({
      _count: { _all: 10 },
      _sum: { total: decimal('1000.00') },
    });
    queryQueue = [
      // costRows
      [
        {
          itemsSubtotal: decimal('1000.00'),
          totalCost: decimal('600.00'),
          historicalCostRevenue: decimal('850.00'),
          fallbackCostRevenue: decimal('50.00'),
          uncostedRevenue: decimal('100.00'),
          uncostedItemsCount: 1n,
        },
      ],
      // hourRows
      [
        { hour: 21, revenue: decimal('700.00'), transactions: 7n },
        { hour: 15, revenue: decimal('300.00'), transactions: 3n },
      ],
      // weekdaySaleRows
      [{ dayOfWeek: 7, revenue: decimal('800.00'), transactions: 8n }],
      // weekdayCostRows
      [{ dayOfWeek: 7, totalCost: decimal('480.00') }],
      // paymentRows
      [
        { method: 'pix', label: null, revenue: decimal('650.00'), transactions: 6n },
        { method: 'credito', label: null, revenue: decimal('350.00'), transactions: 4n },
      ],
      // categoryRows
      [
        {
          categoryId: 'cat-1',
          categoryName: 'Cervejas',
          distinctProducts: 2n,
          quantity: decimal('70.000'),
          revenue: decimal('900.00'),
          totalCost: decimal('600.00'),
        },
      ],
      // allProductsRankingRows
      [
        {
          productId: 'p1',
          name: 'Spaten 600ml',
          unit: 'UN',
          categoryId: 'cat-1',
          categoryName: 'Cervejas',
          salesCount: 8n,
          quantity: decimal('70.000'),
          itemSubtotal: decimal('900.00'),
          totalCost: decimal('600.00'),
          grossProfit: decimal('300.00'),
          historicalRev: decimal('900.00'),
          fallbackRev: decimal('0.00'),
          uncostedRev: decimal('0.00'),
          currentStock: decimal('12.000'),
          minStock: decimal('24.000'),
          isComposite: false,
        },
      ],
      // slowMovingRows
      [
        {
          productId: 'p-slow',
          name: 'Licor Importado Parado',
          unit: 'UN',
          categoryName: 'Destilados',
          currentStock: decimal('4.000'),
          unitCost: decimal('80.00'),
          unitPrice: decimal('140.00'),
          tiedCapital: decimal('320.00'),
        },
      ],
    ];

    const result = await run(() => service.adegaInsights('2026-01-01', '2026-01-07'));

    expect(result.kpis.peakHour).toEqual({ hour: 21, label: '21h', revenue: '700.00' });
    expect(result.kpis.nightRevenueSharePercent).toBe('70.00');
    expect(result.kpis.bestWeekday).toMatchObject({ dayOfWeek: 7, label: 'Sábado', revenue: '800.00' });
    expect(result.kpis.totalTiedCapitalSlowMoving).toBe('320.00');
    expect(result.slowMovingProducts[0].lastSaleAt).toBeNull();
    expect(result.stockoutRisks).toHaveLength(1);
    expect(result.stockoutRisks[0]).toMatchObject({
      productId: 'p1',
      dailyVelocity: '10.00',
      daysOfSupply: '1.2',
      severity: 'critical',
    });
    expect(result.insights.map((i) => i.id)).toEqual(
      expect.arrayContaining([
        'uncosted-items',
        'stockout-risk',
        'top-profit-driver',
        'peak-hour',
        'best-weekday',
        'slow-moving-stock',
        'payment-mix',
      ]),
    );
  });

  it('lists uncosted products and saves batch priceCost updates with cache invalidation', async () => {
    queryQueue = [
      [{ cnt: 1n }],
      [
        {
          productId: 'p2',
          name: 'Gelo 5kg',
          shortCode: 'G5',
          barcode: '7890001',
          unit: 'UN',
          categoryId: 'cat-1',
          categoryName: 'Cervejas',
          priceSell: decimal('10.00'),
          priceCost: decimal('0.00'),
          currentStock: decimal('12.000'),
          isComposite: false,
          soldQuantity: decimal('5.000'),
          itemSubtotal: decimal('50.00'),
          salesCount: 3n,
        },
      ],
    ];

    const list = await run(() =>
      service.uncostedProducts({ startDate: '2026-01-01', endDate: '2026-01-07', scope: 'period' }),
    );
    expect(list.counts).toEqual({ inPeriod: 1, catalog: 4 });
    expect(list.items[0]).toMatchObject({
      productId: 'p2',
      name: 'Gelo 5kg',
      priceSell: '10.00',
      priceCost: '0.00',
      itemSubtotal: '50.00',
    });

    const updated = await run(() =>
      service.updateProductCosts([
        { productId: 'p2', priceCost: 3.5 },
        { productId: 'missing', priceCost: 1.0 },
      ]),
    );
    expect(updated).toEqual({ updatedCount: 1, notFoundIds: ['missing'] });
    expect(prisma.product.update).toHaveBeenCalledTimes(1);
    expect(productsServiceMock.invalidateCache).toHaveBeenCalledWith('tenant-a');
  });

  it('rejects invalid batch priceCost inputs', async () => {
    await expect(run(() => service.updateProductCosts([]))).rejects.toThrow(BadRequestException);
    await expect(
      run(() => service.updateProductCosts([{ productId: 'p1', priceCost: -5 }])),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid dates before acquiring any tenant connection', async () => {
    await expect(service.sales('invalid', 'invalid')).rejects.toThrow(BadRequestException);
    expect(manager.getTenantClient).not.toHaveBeenCalled();
  });

  it('fails closed without an authenticated tenant context', async () => {
    await expect(service.sales('2026-01-01', '2026-01-01')).rejects.toThrow('TenantContext');
    expect(manager.getTenantClient).not.toHaveBeenCalled();
  });
});
