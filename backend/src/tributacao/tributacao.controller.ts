import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TributacaoService } from './tributacao.service';

@UseGuards(JwtAuthGuard)
@Controller('tributacao')
export class TributacaoController {
  constructor(private service: TributacaoService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId, req.user.databaseUrl);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(req.user.tenantId, req.user.databaseUrl, id);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.service.create(req.user.tenantId, req.user.databaseUrl, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.update(req.user.tenantId, req.user.databaseUrl, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(req.user.tenantId, req.user.databaseUrl, id);
  }
}
