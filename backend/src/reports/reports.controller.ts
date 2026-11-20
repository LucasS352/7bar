import { Body, Controller, ForbiddenException, Get, Header, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private assertAuthorized(user: { role?: string; type?: string } | undefined) {
    if (!user || user.type || !['admin', 'superadmin'].includes(user.role ?? '')) {
      throw new ForbiddenException('Sem permissão para visualizar relatórios financeiros.');
    }
  }

  @Get('sales')
  @Header('Cache-Control', 'private, no-store')
  sales(
    @CurrentUser() user: { role?: string; type?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.assertAuthorized(user);
    return this.reports.sales(startDate, endDate);
  }

  @Get('products-ranking')
  @Header('Cache-Control', 'private, no-store')
  productsRanking(
    @CurrentUser() user: { role?: string; type?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    this.assertAuthorized(user);
    return this.reports.productsRanking({
      startDate,
      endDate,
      sortBy,
      categoryId,
      search,
      limit,
    });
  }

  @Get('adega-insights')
  @Header('Cache-Control', 'private, no-store')
  adegaInsights(
    @CurrentUser() user: { role?: string; type?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.assertAuthorized(user);
    return this.reports.adegaInsights(startDate, endDate);
  }

  @Get('uncosted-products')
  @Header('Cache-Control', 'private, no-store')
  uncostedProducts(
    @CurrentUser() user: { role?: string; type?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scope') scope?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    this.assertAuthorized(user);
    return this.reports.uncostedProducts({
      startDate,
      endDate,
      scope,
      categoryId,
      search,
    });
  }

  @Patch('product-costs')
  @Header('Cache-Control', 'private, no-store')
  updateProductCosts(
    @CurrentUser() user: { role?: string; type?: string },
    @Body() body?: { items?: unknown },
  ) {
    this.assertAuthorized(user);
    return this.reports.updateProductCosts(body?.items);
  }
}
