import { demandForecast, forecastWindow } from './demand-forecast';
import { ReportsService } from './reports.service';
import { TenantContextService } from '../prisma/tenant-context.service';

const today = '2026-01-01';
const history = (quantity: number, days = 90, productId = 'same-id', origin = today) =>
  Array.from({ length: days }, (_, i) => ({
    day: new Date(Date.parse(origin) - (i + 1) * 86400000).toISOString().slice(0, 10),
    productId,
    name: productId,
    unit: 'UN',
    quantity,
  }));

it('uses complete UTC-03 dates across the year boundary', () => {
  expect(forecastWindow(new Date('2026-01-01T02:59:59Z')).today).toBe('2025-12-31');
  const [week, fortnight, month, weekend] = demandForecast(history(5), today).projections;
  expect(week.items[0]).toMatchObject({
    last7: 35,
    last30: 150,
    last90: 450,
    estimate: 35,
    trend: 'Estável',
  });
  expect([fortnight, month, weekend].map((p) => p.items[0].estimate)).toEqual([70, 150, 10]);
  expect(weekend).toMatchObject({ start: '2026-01-03', end: '2026-01-04' });
});

it('handles short history, empty shops, closed weekdays and an exceptional sale', () => {
  expect(demandForecast([], today).projections[0].items).toEqual([]);
  expect(demandForecast(history(1, 20), today).projections[0].insufficient).toBe(1);
  const saturdays = history(10).filter((r) => new Date(r.day).getUTCDay() === 6);
  saturdays[0].quantity = 10000;
  const estimate = demandForecast(saturdays, today).projections[0].items[0].estimate;
  expect(estimate).toBeGreaterThanOrEqual(10);
  expect(estimate).toBeLessThan(12);
});

it('keeps simultaneous forecasts and purchase quantities in the authenticated database', async () => {
  const context = new TenantContextService();
  const origin = forecastWindow(new Date()).today;
  const database = (quantity: number, stock: number | null) => ({
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce(history(quantity, 90, 'same-id', origin))
      .mockResolvedValueOnce(stock === null ? [] : [{ id: 'same-id', stock, minimum: 2, pending: 3 }]),
  });
  const databases = { a: database(1, null), b: database(2, 4) };
  const manager = {
    getTenantClient: (id: 'a' | 'b', url: string) => {
      expect(url).toBe('db-' + id);
      return databases[id];
    },
  };
  const service = new ReportsService(manager as never, context);
  const [a, b] = await Promise.all(
    ['a', 'b'].map((tenantId) =>
      context.run({ tenantId, databaseUrl: 'db-' + tenantId, userId: 'same-owner' }, () =>
        service.forecast(tenantId === 'b'),
      ),
    ),
  );
  expect(databases.a.$queryRaw).toHaveBeenCalledTimes(1);
  expect(databases.b.$queryRaw).toHaveBeenCalledTimes(2);
  expect(a.projections[0].items[0]).toMatchObject({ estimate: 7, inventory: null });
  expect(b.projections[0].items[0]).toMatchObject({ estimate: 14, inventory: { required: 9 } });
  expect(a.planner[0]).toMatchObject({ sold30: 30, inventory: null });
  expect(b.planner[0]).toMatchObject({ sold30: 60, inventory: { stock: 4, pending: 3 } });
});
