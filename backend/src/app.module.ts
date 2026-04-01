import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { TenantsModule } from './tenants/tenants.module';
import { SalesModule } from './sales/sales.module';
import { CashRegistersModule } from './cash-registers/cash-registers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, ProductsModule, CategoriesModule, CustomersModule, TenantsModule, SalesModule, CashRegistersModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
