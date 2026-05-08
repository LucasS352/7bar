import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { NfceModule } from '../nfce/nfce.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [NfceModule, PrismaModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
