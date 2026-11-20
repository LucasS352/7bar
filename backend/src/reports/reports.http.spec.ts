import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtStrategy, jwtConstants } from '../auth/jwt.strategy';
import { StationAccessService } from '../auth/station-access.service';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService, TenantInterceptor } from '../prisma/tenant-context.service';

describe('Reports HTTP authorization and tenant context', () => {
  let app: INestApplication;
  const secret = 'reports-http-test-only-32-chars-minimum';
  const previousSecret = jwtConstants.secret;
  const previousEnv = process.env.JWT_SECRET;
  const jwt = new JwtService({ secret });
  const context = new TenantContextService();

  const sales = jest.fn(async () => ({ tenantId: context.get().tenantId }));
  const productsRanking = jest.fn(async () => ({ tenantId: context.get().tenantId }));
  const adegaInsights = jest.fn(async () => ({ tenantId: context.get().tenantId }));
  const uncostedProducts = jest.fn(async () => ({ tenantId: context.get().tenantId }));
  const updateProductCosts = jest.fn(async () => ({ tenantId: context.get().tenantId }));

  const token = (role: string, tenantId = 'a', extra: Record<string, unknown> = {}) =>
    jwt.sign({ sub: 'user', role, tenantId, ...extra });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    jwtConstants.secret = secret;
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ReportsController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        StationAccessService,
        TenantInterceptor,
        { provide: JwtService, useValue: jwt },
        {
          provide: ReportsService,
          useValue: { sales, productsRanking, adegaInsights, uncostedProducts, updateProductCosts },
        },
        { provide: TenantContextService, useValue: context },
        {
          provide: HeartPrismaService,
          useValue: {
            tenant: {
              findUnique: async ({ where }: any) => ({ id: where.id, databaseUrl: 'unused', modulos: {} }),
            },
          },
        },
        { provide: TenantConnectionManager, useValue: {} },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(module.get(TenantInterceptor));
    await app.init();
  });

  beforeEach(() => {
    sales.mockClear();
    productsRanking.mockClear();
    adegaInsights.mockClear();
    uncostedProducts.mockClear();
    updateProductCosts.mockClear();
  });

  afterAll(async () => {
    await app?.close();
    jwtConstants.secret = previousSecret;
    if (previousEnv === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousEnv;
  });

  const endpoints = [
    '/api/reports/sales?startDate=2026-01-01&endDate=2026-01-02',
    '/api/reports/products-ranking?startDate=2026-01-01&endDate=2026-01-02&sortBy=profit',
    '/api/reports/adega-insights?startDate=2026-01-01&endDate=2026-01-02',
    '/api/reports/uncosted-products?startDate=2026-01-01&endDate=2026-01-02&scope=period',
  ];

  it.each(endpoints)('rejects missing or invalid authentication on %s', async (url) => {
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer()).get(url).auth('invalid', { type: 'bearer' }).expect(401);
    expect(sales).not.toHaveBeenCalled();
    expect(productsRanking).not.toHaveBeenCalled();
    expect(adegaInsights).not.toHaveBeenCalled();
    expect(uncostedProducts).not.toHaveBeenCalled();
  });

  it('protects PATCH /api/reports/product-costs by RBAC', async () => {
    const patchUrl = '/api/reports/product-costs';
    await request(app.getHttpServer()).patch(patchUrl).send({ items: [] }).expect(401);
    await request(app.getHttpServer())
      .patch(patchUrl)
      .auth(token('stockist'), { type: 'bearer' })
      .send({ items: [] })
      .expect(403);
    expect(updateProductCosts).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .patch(patchUrl)
      .auth(token('admin'), { type: 'bearer' })
      .send({ items: [{ productId: 'p1', priceCost: 5 }] })
      .expect(200, { tenantId: 'a' });
    expect(updateProductCosts).toHaveBeenCalledWith([{ productId: 'p1', priceCost: 5 }]);
  });

  it.each(['stockist', 'cashier', 'operator', 'station'])(
    'denies role %s across all report endpoints',
    async (role) => {
      for (const url of endpoints) {
        await request(app.getHttpServer()).get(url).auth(token(role), { type: 'bearer' }).expect(403);
      }
      expect(sales).not.toHaveBeenCalled();
      expect(productsRanking).not.toHaveBeenCalled();
      expect(adegaInsights).not.toHaveBeenCalled();
      expect(uncostedProducts).not.toHaveBeenCalled();
    },
  );

  it.each(['admin', 'superadmin'])('allows %s with no-store cache headers', async (role) => {
    for (const url of endpoints) {
      await request(app.getHttpServer())
        .get(url)
        .auth(token(role), { type: 'bearer' })
        .expect('Cache-Control', 'private, no-store')
        .expect(200, { tenantId: 'a' });
    }
    expect(sales).toHaveBeenCalledWith('2026-01-01', '2026-01-02');
    expect(productsRanking).toHaveBeenCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      sortBy: 'profit',
      categoryId: undefined,
      search: undefined,
      limit: undefined,
    });
    expect(adegaInsights).toHaveBeenCalledWith('2026-01-01', '2026-01-02');
    expect(uncostedProducts).toHaveBeenCalledWith({
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      scope: 'period',
      categoryId: undefined,
      search: undefined,
    });
  });

  it('isolates concurrent tenants and ignores a forged tenant query', async () => {
    await Promise.all(
      ['a', 'b'].map((tenant) =>
        request(app.getHttpServer())
          .get(`${endpoints[0]}&tenantId=forged`)
          .auth(token('admin', tenant), { type: 'bearer' })
          .expect(200, { tenantId: tenant }),
      ),
    );
  });
});
