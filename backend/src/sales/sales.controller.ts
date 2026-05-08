import { Controller, Post, Get, Body, UseGuards, Request, Param, NotFoundException, BadRequestException, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  checkout(@Request() req: any, @Body() body: any) {
    return this.salesService.checkout(
      req.user.tenantId,
      req.user.databaseUrl,
      req.user.sub, // operatorId vem do JWT
      body,
    );
  }

  @Get()
  findAll(@Request() req: any) {
    return this.salesService.findAll(req.user.tenantId, req.user.databaseUrl);
  }

  @Get('today')
  getTodaySales(@Request() req: any) {
    return this.salesService.getTodaySales(req.user.tenantId, req.user.databaseUrl);
  }

  /** Polling de status NFC-e — chamado pelo frontend a cada 2s */
  @Get(':id/nfce-status')
  getNfceStatus(@Request() req: any, @Param('id') id: string) {
    return this.salesService.getNfceStatus(req.user.tenantId, req.user.databaseUrl, id);
  }

  /** Solicitar emissão manual de NFC-e para uma venda já existente */
  @Post(':id/emit-nfce')
  emitNfce(@Request() req: any, @Param('id') id: string) {
    return this.salesService.emitNfce(req.user.tenantId, req.user.databaseUrl, id);
  }

  /** Exportar XMLs em lote para contabilidade */
  @Get('export/xmls')
  async exportXmls(@Request() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @Res() res: Response) {
    if (!startDate || !endDate) {
      throw new BadRequestException('As datas inicial e final são obrigatórias.');
    }
    const stream = await this.salesService.exportNfceXmls(req.user.tenantId, req.user.databaseUrl, startDate, endDate);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="xmls_${startDate}_a_${endDate}.zip"`,
    });
    stream.getStream().pipe(res);
  }
}
