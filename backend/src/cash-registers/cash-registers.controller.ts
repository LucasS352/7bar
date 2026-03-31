import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  open(@CurrentUser() user: any, @Body('openingValue') openingValue: number) {
    return this.cashRegistersService.openRegister(user.tenantId, user.databaseUrl, user.userId, openingValue || 0);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.cashRegistersService.findAll(user.tenantId, user.databaseUrl);
  }

  @Post(':id/close')
  close(@CurrentUser() user: any, @Param('id') id: string, @Body('closingValue') closingValue: number) {
    return this.cashRegistersService.closeRegister(user.tenantId, user.databaseUrl, id, closingValue);
  }

  @Post(':id/movement')
  addMovement(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { type: 'IN' | 'OUT', value: number, reason: string }) {
    return this.cashRegistersService.addMovement(user.tenantId, user.databaseUrl, id, body.type, body.value, body.reason);
  }

  @Get(':id/report')
  getReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cashRegistersService.getReport(user.tenantId, user.databaseUrl, id);
  }

  @Get('current')
  getCurrent(@CurrentUser() user: any) {
    return this.cashRegistersService.getCurrentRegister(user.tenantId, user.databaseUrl, user.userId);
  }
}
