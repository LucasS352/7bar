import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   *
   * Retorna todos os KPIs e dados de analytics em uma única chamada.
   * Se startDate/endDate não fornecidos, usa o dia atual (fuso Brasil -03:00) como padrão.
   */
  @Get('summary')
  @Header('Cache-Control', 'private, no-store')
  getSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('refresh') refresh?: string,
  ) {
    const todayBr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const forceRefresh = refresh === '1' || refresh === 'true';
    return this.dashboardService.getSummary(
      user.tenantId,
      startDate || todayBr,
      endDate || todayBr,
      forceRefresh,
    );
  }
}
