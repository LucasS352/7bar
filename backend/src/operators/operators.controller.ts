import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Post()
  create(@Request() req: any, @Body() body: { name: string; pin: string; isManager?: boolean; jobTitle?: string }) {
    return this.operatorsService.create(req.user.tenantId, body);
  }

  @Get('consumptions')
  getConsumptions(@Request() req: any) {
    return this.operatorsService.getConsumptions(req.user.tenantId);
  }

  @Post('consumptions/manual')
  createManualConsumption(@Request() req: any, @Body() body: { operatorId: string; productId: string; quantity: number }) {
    return this.operatorsService.createManualConsumption(req.user.tenantId, body);
  }

  @Get('consumptions/:operatorId')
  getOperatorConsumptionHistory(@Request() req: any, @Param('operatorId') operatorId: string) {
    return this.operatorsService.getOperatorConsumptionHistory(req.user.tenantId, operatorId);
  }

  @Post('consumptions/:operatorId/settle')
  settleConsumptions(@Request() req: any, @Param('operatorId') operatorId: string, @Body() body?: { itemIds?: string[] }) {
    return this.operatorsService.settleConsumptions(req.user.tenantId, operatorId, body?.itemIds);
  }

  @Delete('consumptions/:id')
  deleteConsumption(@Request() req: any, @Param('id') id: string) {
    return this.operatorsService.deleteConsumption(req.user.tenantId, id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.operatorsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.operatorsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; pin?: string; active?: boolean; isManager?: boolean; jobTitle?: string }) {
    return this.operatorsService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.operatorsService.remove(req.user.tenantId, id);
  }
}
