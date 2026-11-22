import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { jwtConstants } from '../auth/jwt.strategy';
import { LeadgerModule } from '../leadger/leadger.module';

@Module({
  imports: [
    PrismaModule,
    LeadgerModule,
    JwtModule.register({
      secret: jwtConstants.secret,
    }),
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}

