import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { TenantsModule } from './tenants/tenants.module';
import { SalesModule } from './sales/sales.module';
import { CashRegistersModule } from './cash-registers/cash-registers.module';
import { UsersModule } from './users/users.module';
import { TributacaoModule } from './tributacao/tributacao.module';
import { NfceModule } from './nfce/nfce.module';
import { OperatorsModule } from './operators/operators.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './prisma/tenant-context.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    TenantsModule,
    SalesModule,
    CashRegistersModule,
    UsersModule,
    TributacaoModule,
    NfceModule,
    OperatorsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
