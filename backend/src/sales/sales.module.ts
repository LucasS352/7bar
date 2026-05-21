import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { NfceModule } from '../nfce/nfce.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';

import { SalesCronService } from './sales-cron.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [NfceModule, PrismaModule, ProductsModule, MailModule],
  providers: [SalesService, SalesCronService],
  controllers: [SalesController],
})
export class SalesModule {}
