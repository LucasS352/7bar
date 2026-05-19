import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { ProductsService, TenantSettingsDto } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

interface AuthUser {
  tenantId: string;
  databaseUrl: string;
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.productsService.findAll(
      Number(page || 1), 
      Number(limit || 50)
    );
  }

  @Get('lookup/:barcode')
  lookupBarcode(@Param('barcode') barcode: string) {
    return this.productsService.lookupBarcode(barcode);
  }

  @Post()
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Post('bulk')
  bulkEntry(@Body('items') items: any[]) {
    return this.productsService.bulkEntry(items);
  }

  /** Entrada de estoque incremental — usa Prisma increment (sem condição de corrida) */
  @Post('add-stock/:id')
  addStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason?: string,
  ) {
    return this.productsService.addStock(id, Number(quantity), reason);
  }

  /** Lê configurações globais do tenant (ex: allowNegativeStock) */
  @Get('settings')
  getSettings(): Promise<TenantSettingsDto> {
    return this.productsService.getSettings();
  }

  /** Salva configurações globais do tenant */
  @Patch('settings')
  saveSettings(@Body() body: { allowNegativeStock: boolean }): Promise<TenantSettingsDto> {
    return this.productsService.saveSettings(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
