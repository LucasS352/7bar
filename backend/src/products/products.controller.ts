import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
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
  findAll(@CurrentUser() user: AuthUser) {
    return this.productsService.findAll(user.tenantId, user.databaseUrl);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.productsService.create(user.tenantId, user.databaseUrl, body);
  }

  @Post('bulk')
  bulkEntry(@CurrentUser() user: AuthUser, @Body('items') items: any[]) {
    return this.productsService.bulkEntry(user.tenantId, user.databaseUrl, items);
  }

  /** Entrada de estoque incremental — usa Prisma increment (sem condição de corrida) */
  @Post('add-stock/:id')
  addStock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('reason') reason?: string,
  ) {
    return this.productsService.addStock(user.tenantId, user.databaseUrl, id, Number(quantity), reason);
  }

  /** Lê configurações globais do tenant (ex: allowNegativeStock) */
  @Get('settings')
  getSettings(@CurrentUser() user: AuthUser): Promise<TenantSettingsDto> {
    return this.productsService.getSettings(user.tenantId, user.databaseUrl);
  }

  /** Salva configurações globais do tenant */
  @Patch('settings')
  saveSettings(@CurrentUser() user: AuthUser, @Body() body: { allowNegativeStock: boolean }): Promise<TenantSettingsDto> {
    return this.productsService.saveSettings(user.tenantId, user.databaseUrl, body);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.productsService.update(user.tenantId, user.databaseUrl, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.remove(user.tenantId, user.databaseUrl, id);
  }
}
