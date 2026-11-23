import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersService } from './cash-registers.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { JwtService } from '@nestjs/jwt';

describe('CashRegistersService', () => {
  let service: CashRegistersService;
  let prismaMock: {
    cashRegister: { count: jest.Mock; findMany: jest.Mock };
    sale: { groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      cashRegister: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      sale: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CashRegistersService,
        { provide: TenantConnectionManager, useValue: { getTenantClient: jest.fn().mockResolvedValue(prismaMock) } },
        { provide: TenantContextService, useValue: { get: jest.fn().mockReturnValue({ tenantId: 't1', databaseUrl: 'mysql://localhost/t1' }) } },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get<CashRegistersService>(CashRegistersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('pagina histórico no servidor com limit máximo 100 e agrega vendas via groupBy SQL', async () => {
    prismaMock.cashRegister.count.mockResolvedValue(42);
    prismaMock.cashRegister.findMany.mockResolvedValue([
      {
        id: 'reg-1',
        code: 92,
        openingTime: new Date('2026-09-08T10:47:00Z'),
        closingTime: new Date('2026-09-08T23:04:00Z'),
        openingValue: 600,
        closingValue: 1383.1,
        closingDetails: null,
        status: 'closed',
        operator: { id: 'op-1', name: 'Daniela', isManager: false },
      },
      {
        id: 'reg-2',
        code: 91,
        openingTime: new Date('2026-09-07T10:09:00Z'),
        closingTime: new Date('2026-09-07T23:01:00Z'),
        openingValue: 600,
        closingValue: 0,
        closingDetails: JSON.stringify({ totalVendasAjustado: 4999.9 }),
        status: 'closed',
        operator: { id: 'op-2', name: 'Luiz', isManager: false },
      },
    ]);
    prismaMock.sale.groupBy.mockResolvedValue([
      { cashRegisterId: 'reg-1', _sum: { total: '3041.14' } },
      { cashRegisterId: 'reg-2', _sum: { total: '5354.44' } },
    ]);

    const res = await service.findAll({ page: 2, limit: 500 });

    expect(prismaMock.cashRegister.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 100,
        orderBy: { openingTime: 'desc' },
      }),
    );
    // Garante que sales não é mais carregado em include nem traz conferenceDetails
    const findManyArg = prismaMock.cashRegister.findMany.mock.calls[0][0];
    expect(findManyArg.include).toBeUndefined();
    expect(findManyArg.select.closingDetails).toBe(true);
    expect(findManyArg.select.conferenceDetails).toBeUndefined();

    expect(prismaMock.sale.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['cashRegisterId'],
        where: expect.objectContaining({
          cashRegisterId: { in: ['reg-1', 'reg-2'] },
          status: { not: 'cancelled' },
          source: { not: 'ajuste_fiscal' },
        }),
      }),
    );

    expect(res.data[0].totalSales).toBeCloseTo(3041.14, 2);
    expect(res.data[1].totalSales).toBeCloseTo(4999.9, 2);
    expect(res.meta).toEqual({
      total: 42,
      page: 2,
      limit: 100,
      lastPage: 1,
      totalPages: 1,
    });
  });

  it('aplica filtros status=pending_audit, busca por #código/operador e pula groupBy quando vazio', async () => {
    prismaMock.cashRegister.count.mockResolvedValue(0);
    prismaMock.cashRegister.findMany.mockResolvedValue([]);

    const res = await service.findAll({ status: 'pending_audit', search: '#90' });

    expect(prismaMock.cashRegister.count).toHaveBeenCalledWith({
      where: {
        status: 'closed',
        closingValue: null,
        OR: [{ operator: { name: { contains: '#90' } } }, { code: 90 }],
      },
    });
    expect(prismaMock.sale.groupBy).not.toHaveBeenCalled();
    expect(res).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 15, lastPage: 1, totalPages: 1 },
    });
  });

  it('ajusta para última página válida quando page ultrapassa totalPages', async () => {
    prismaMock.cashRegister.count.mockResolvedValue(20);
    prismaMock.cashRegister.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'reg-last',
          code: 1,
          openingTime: new Date('2026-08-01T10:00:00Z'),
          closingTime: null,
          openingValue: 200,
          closingValue: null,
          closingDetails: null,
          status: 'open',
          operator: null,
        },
      ]);

    const res = await service.findAll({ page: 9, limit: 15 });

    expect(prismaMock.cashRegister.findMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.cashRegister.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 15, take: 15 }),
    );
    expect(res.meta.page).toBe(2);
    expect(res.meta.lastPage).toBe(2);
  });
});
