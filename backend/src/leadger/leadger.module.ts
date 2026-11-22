import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadgerController } from './leadger.controller';
import { LeadgerService } from './leadger.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadgerController],
  providers: [LeadgerService],
  exports: [LeadgerService],
})
export class LeadgerModule {}
