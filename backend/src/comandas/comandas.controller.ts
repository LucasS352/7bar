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
  async create(
    @Body()
    body: {
      number: string;
      customerName?: string;
      notes?: string;
      responsibleWaiterId?: string;
      waiterId?: string;
    },
  ) {
    return this.comandasService.create(body);
  }

  @Get('assets/:productId')
  availableAssets(@Param('productId') productId: string) { return this.comandasService.availableAssets(productId); }

  @Get('service-rounds')
  serviceRounds() { return this.comandasService.serviceRounds(); }

  @Post(':id/items/:itemId/timer/snooze')
  snooze(@Param('id') id: string, @Param('itemId') itemId: string,
    @Body() body: { extraMinutes: number; expectedDueAt: string }) {
    return this.comandasService.snoozeTimer(id, itemId, body.extraMinutes, body.expectedDueAt);
  }

  @Post(':id/items/:itemId/return-asset')
  returnAsset(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.comandasService.returnAsset(id, itemId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.comandasService.findOne(id);
  }

  @Post(':id/items')
  async addItems(
    @Param('id') id: string,
    @Body()
    body: {
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice?: number;
        notes?: string;
        createdById?: string;
        serveImmediately?: boolean;
        assetNumber?: number;
        modifiers?: Array<{ optionId: string }>;
      }>;
    },
  ) {
    return this.comandasService.addItems(id, body.items);
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.comandasService.removeItem(id, itemId);
  }

  @Post(':id/request-payment')
  async requestPayment(@Param('id') id: string) {
    return this.comandasService.requestPayment(id);
  }

  @Post(':id/reopen')
  async reopen(@Param('id') id: string) {
    return this.comandasService.reopen(id);
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

