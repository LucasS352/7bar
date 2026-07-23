import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ComandasService } from './comandas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/comandas')
@UseGuards(JwtAuthGuard)
export class ComandasController {
  constructor(private readonly comandasService: ComandasService) {}

  @Get()
  async findAll(@Query('status') status?: string) {
    return this.comandasService.findAll(status || 'open');
  }

  @Post()
  async create(@Body() body: { number: string; customerName?: string; notes?: string }) {
    return this.comandasService.create(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.comandasService.findOne(id);
  }

  @Post(':id/items')
  async addItems(
    @Param('id') id: string,
    @Body() body: { items: Array<{ productId: string; quantity: number; unitPrice?: number; notes?: string }> },
  ) {
    return this.comandasService.addItems(id, body.items);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.comandasService.removeItem(id, itemId);
  }

  @Post(':id/close')
  async closeComanda(@Param('id') id: string, @Body() body: { saleId?: string }) {
    return this.comandasService.closeComanda(id, body.saleId);
  }

  @Delete(':id')
  async cancelComanda(@Param('id') id: string) {
    return this.comandasService.cancelComanda(id);
  }
}
