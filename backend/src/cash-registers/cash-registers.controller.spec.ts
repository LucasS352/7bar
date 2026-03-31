import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersController } from './cash-registers.controller';

describe('CashRegistersController', () => {
  let controller: CashRegistersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashRegistersController],
    }).compile();

    controller = module.get<CashRegistersController>(CashRegistersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
