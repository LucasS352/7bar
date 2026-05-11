import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Post()
  create(@Request() req: any, @Body() body: { name: string; pin: string }) {
    return this.operatorsService.create(req.user.tenantId, req.user.databaseUrl, body);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.operatorsService.findAll(req.user.tenantId, req.user.databaseUrl);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.operatorsService.findOne(req.user.tenantId, req.user.databaseUrl, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() body: { name?: string; pin?: string; active?: boolean }) {
    return this.operatorsService.update(req.user.tenantId, req.user.databaseUrl, id, body);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.operatorsService.remove(req.user.tenantId, req.user.databaseUrl, id);
  }
}
