import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: any, @Body() body: any) {
    return this.salesService.checkout(user.tenantId, user.databaseUrl, body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.salesService.findAll(user.tenantId, user.databaseUrl);
  }

  @Get('today')
  getTodaySales(@CurrentUser() user: any) {
    return this.salesService.getTodaySales(user.tenantId, user.databaseUrl);
  }
}
