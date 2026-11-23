import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersController } from './cash-registers.controller';
import { CashRegistersService } from './cash-registers.service';

describe('CashRegistersController', () => {
  let controller: CashRegistersController;
  let findAllMock: jest.Mock;

  beforeEach(async () => {
    findAllMock = jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 15, lastPage: 1, totalPages: 1 } });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashRegistersController],
      providers: [{ provide: CashRegistersService, useValue: { findAll: findAllMock } }],
    }).compile();

    controller = module.get<CashRegistersController>(CashRegistersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards pagination and filter query parameters to CashRegistersService.findAll', async () => {
    await controller.findAll('2', '30', 'pending_audit', '#92');
    expect(findAllMock).toHaveBeenCalledWith({
      page: 2,
      limit: 30,
      status: 'pending_audit',
      search: '#92',
    });
  });
});
