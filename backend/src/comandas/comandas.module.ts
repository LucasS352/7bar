import { Module } from '@nestjs/common';
import { ComandasController } from './comandas.controller';
import { ComandasService } from './comandas.service';
import { ProductsModule } from '../products/products.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [ProductsModule, IntegrationsModule],
  controllers: [ComandasController],
  providers: [ComandasService],
  exports: [ComandasService],
})
export class ComandasModule {}
