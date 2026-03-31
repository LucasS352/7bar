import { Module } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { CashRegistersController } from './cash-registers.controller';

@Module({
  providers: [CashRegistersService],
  controllers: [CashRegistersController]
})
export class CashRegistersModule {}
