import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.productsService.findAll(user.tenantId, user.databaseUrl);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.productsService.create(user.tenantId, user.databaseUrl, body);
  }

  @Post('bulk')
  bulkEntry(@CurrentUser() user: any, @Body('items') items: any[]) {
    return this.productsService.bulkEntry(user.tenantId, user.databaseUrl, items);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.productsService.update(user.tenantId, user.databaseUrl, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.remove(user.tenantId, user.databaseUrl, id);
  }
}
