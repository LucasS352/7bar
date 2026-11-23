import { DashboardService } from './dashboard.service';
import { SalesService } from '../sales/sales.service';

describe('DashboardService SQL aggregation & cache', () => {
  const createPrismaMock = () => {
    // Ordem das 6 $queryRaw no Promise.all do DashboardService.computeSummary:
    // 1. openRegisters, 2. kpiAgg, 3. hourRows, 4. dayRows, 5. paymentRows, 6. productRows
    const queue: any[] = [
      [{
        cashRegisterId: 'reg-1',
        code: 1,
        operatorName: 'Lucas',
        operatorId: 'op-1',
        openedAt: new Date('2026-11-22T10:00:00Z'),
        openingValue: 100,
        total: 150,
        salesCount: BigInt(3),
      }],
      [{
        todayRevenue: 150,
        todayTransactions: BigInt(3),
        weekRevenue: 500,
        prevWeekRevenue: 400,
        monthRevenue: 1200,
      }],
      [
        { brHour: 15, revenue: 150, transactions: BigInt(3) },
      ],
      [
        { dayKey: '2026-11-22', revenue: 150 },
      ],
      [
        { method: 'dinheiro', label: 'Dinheiro', total: 100 },
        { method: 'pix', label: 'PIX', total: 50 },
      ],
      [
        { productId: 'prod-1', name: 'Cerveja Lata', qty: 10, revenue: 100 },
        { productId: 'prod-2', name: 'Refrigerante 2L', qty: 5, revenue: 50 },
      ],
    ];

    return {
      $queryRaw: jest.fn().mockImplementation(() => Promise.resolve(queue.shift() ?? [])),
      payable: { findMany: jest.fn().mockResolvedValue([]) },
    };
  };

  it('agrega KPIs e série do período sem carregar linhas brutas nem usar toLocaleString em loop', async () => {
    const prisma = createPrismaMock();
    const tenantManager = { getTenantClient: jest.fn().mockResolvedValue(prisma) } as any;
    const tenantContext = { get: jest.fn().mockReturnValue({ tenantId: 'tenant-a', databaseUrl: 'mysql://a' }) } as any;

    const service = new DashboardService(tenantManager, tenantContext);
    const result = await service.getSummary('tenant-a', '2026-06-01', '2026-11-22');

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);
    expect(result.openRegisters[0]).toMatchObject({
      cashRegisterId: 'reg-1',
      operatorName: 'Lucas',
      total: 150,
      salesCount: 3,
    });
    expect(result.today).toEqual({ revenue: 150, transactions: 3 });
    expect(result.week).toEqual({ revenue: 500, vsLastWeek: 25 });
    expect(result.month).toEqual({ revenue: 1200 });
    expect(result.period.revenue).toBe(150);
    expect(result.period.transactions).toBe(3);
    expect(result.period.avgTicket).toBe(50);
    expect(result.period.byHour[15]).toBe(150);
    expect(result.period.byDay['2026-11-22']).toBe(150);
    // 2026-11-22 é domingo -> segunda-feira correspondente é 2026-11-16
    expect(result.period.byWeek['2026-11-16']).toBe(150);
    expect(result.period.byMonth['2026-11']).toBe(150);
    expect(result.period.byPaymentMethod).toMatchObject({ dinheiro: 100, pix: 50 });
    expect(result.period.topProducts).toHaveLength(2);
    expect(result.period.topProducts[0]).toMatchObject({ name: 'Cerveja Lata', qty: 10, revenue: 100 });
  });

  it('isola cache por tenant, coalesces leituras simultâneas e permite forceRefresh / invalidateCache', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      payable: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const tenantManager = { getTenantClient: jest.fn().mockResolvedValue(prisma) } as any;
    const tenantContext = { get: jest.fn().mockReturnValue({ tenantId: 'tenant-a', databaseUrl: 'mysql://a' }) } as any;

    const service = new DashboardService(tenantManager, tenantContext);

    // Leituras concorrentes idênticas usam a mesma promise em voo (1 conjunto de 6 queries)
    await Promise.all([
      service.getSummary('tenant-a', '2026-11-01', '2026-11-22'),
      service.getSummary('tenant-a', '2026-11-01', '2026-11-22'),
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);

    // Nova chamada dentro do TTL vem do cache
    await service.getSummary('tenant-a', '2026-11-01', '2026-11-22');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);

    // Tenant diferente nunca reutiliza cache do tenant-a
    await service.getSummary('tenant-b', '2026-11-01', '2026-11-22');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(12);

    // forceRefresh fura cache e recalcula
    await service.getSummary('tenant-a', '2026-11-01', '2026-11-22', true);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(18);

    // invalidateCache limpa apenas o tenant especificado
    service.invalidateCache('tenant-a');
    await service.getSummary('tenant-b', '2026-11-01', '2026-11-22');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(18);
    await service.getSummary('tenant-a', '2026-11-01', '2026-11-22');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(24);
  });

  it('SalesService.findAll com view=dashboard pula COUNT(*) e omite nfceXml/imageUrl pesados', async () => {
    const prisma = {
      sale: {
        count: jest.fn().mockResolvedValue(999),
        findMany: jest.fn().mockResolvedValue([{ id: 'sale-1', total: 25, items: [], payments: [] }]),
      },
    };
    const salesService = new SalesService(
      { getTenantClient: jest.fn().mockResolvedValue(prisma) } as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue({ tenantId: 'tenant-1', databaseUrl: 'mysql://db' }) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const res = await salesService.findAll(1, 200, '2026-06-01', '2026-11-22', 'dashboard');

    expect(prisma.sale.count).not.toHaveBeenCalled();
    expect(prisma.sale.findMany).toHaveBeenCalledTimes(1);
    const callArg = prisma.sale.findMany.mock.calls[0][0];
    expect(callArg.select).toBeDefined();
    expect(callArg.select.nfceXml).toBeUndefined();
    expect(callArg.select.items.select.product).toEqual({ select: { name: true } });
    expect(res.data).toHaveLength(1);
  });
});
