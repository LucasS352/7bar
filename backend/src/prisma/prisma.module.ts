import { Global, Module } from '@nestjs/common';
import { HeartPrismaService } from './heart-prisma.service';
import { TenantConnectionManager } from './tenant-prisma.service';

@Global()
@Module({
  providers: [HeartPrismaService, TenantConnectionManager],
  exports: [HeartPrismaService, TenantConnectionManager],
})
export class PrismaModule {}
