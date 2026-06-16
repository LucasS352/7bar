import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CashRegistersService } from './cash-registers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post('open')
  open(@Body() body: { openingValue: number, operatorId?: string }) {
    return this.cashRegistersService.openRegister(body.openingValue || 0, body.operatorId);
  }

  @Get()
  findAll() {
    return this.cashRegistersService.findAll();
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body('closingValue') closingValue: number) {
    return this.cashRegistersService.closeRegister(id, closingValue);
  }

  @Post(':id/movement')
  addMovement(@Param('id') id: string, @Body() body: { type: 'IN' | 'OUT', value: number, reason: string }) {
    return this.cashRegistersService.addMovement(id, body.type, body.value, body.reason);
  }

  @Get(':id/report')
  getReport(@Param('id') id: string) {
    return this.cashRegistersService.getReport(id);
  }

  @Get('current')
  getCurrent(@Query('operatorId') operatorId?: string) {
    return this.cashRegistersService.getCurrentRegister(operatorId);
  }
}
