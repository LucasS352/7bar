import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { safeEqual } from '../common/security/security';
import { LeadgerService } from './leadger.service';

@Controller('tenants/setup/leadger')
export class LeadgerController {
  constructor(private readonly leadgerService: LeadgerService) {}

  private assertSetupPin(req: any) {
    const pin = req?.headers?.['x-setup-pin'];
    if (!safeEqual(pin, process.env.SETUP_PIN)) {
      throw new UnauthorizedException('PIN do Sys-Init inválido.');
    }
  }

  @Get('status')
  @Header('Cache-Control', 'no-store')
  getStatus(@Request() req: any) {
    this.assertSetupPin(req);
    return this.leadgerService.getStatus();
  }

  @Get('clients')
  @Header('Cache-Control', 'no-store')
  listClients(@Request() req: any) {
    this.assertSetupPin(req);
    return this.leadgerService.listBillingClients();
  }

  @Post('clients')
  @Header('Cache-Control', 'no-store')
  createClient(@Request() req: any, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.createBillingClient(body);
  }

  @Patch('clients/:clientId')
  @Header('Cache-Control', 'no-store')
  updateClient(@Request() req: any, @Param('clientId') clientId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.updateBillingClient(clientId, body);
  }

  @Get('tenants/:tenantId')
  @Header('Cache-Control', 'no-store')
  getTenantDetails(@Request() req: any, @Param('tenantId') tenantId: string) {
    this.assertSetupPin(req);
    return this.leadgerService.getTenantLeadgerDetails(tenantId);
  }

  @Put('tenants/:tenantId/base')
  @Header('Cache-Control', 'no-store')
  updateBase(@Request() req: any, @Param('tenantId') tenantId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.updateTenantBaseConfig(tenantId, body);
  }

  @Post('tenants/:tenantId/sync-base')
  @Header('Cache-Control', 'no-store')
  syncBase(@Request() req: any, @Param('tenantId') tenantId: string) {
    this.assertSetupPin(req);
    return this.leadgerService.enqueueBaseSync(tenantId);
  }

  @Post('tenants/:tenantId/invoices')
  @Header('Cache-Control', 'no-store')
  createInvoice(@Request() req: any, @Param('tenantId') tenantId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.createInvoice(tenantId, body);
  }

  @Patch('invoices/:invoiceId')
  @Header('Cache-Control', 'no-store')
  updateInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.updateInvoice(invoiceId, body);
  }

  @Post('invoices/:invoiceId/pay')
  @Header('Cache-Control', 'no-store')
  payInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.markInvoicePaid(invoiceId, body);
  }

  @Post('invoices/:invoiceId/refund')
  @Header('Cache-Control', 'no-store')
  refundInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string, @Body() body: any) {
    this.assertSetupPin(req);
    return this.leadgerService.refundInvoice(invoiceId, body);
  }

  @Post('invoices/:invoiceId/cancel')
  @Header('Cache-Control', 'no-store')
  cancelInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string) {
    this.assertSetupPin(req);
    return this.leadgerService.cancelInvoice(invoiceId);
  }

  @Get('reconciliation')
  @Header('Cache-Control', 'no-store')
  reconciliation(@Request() req: any) {
    this.assertSetupPin(req);
    return this.leadgerService.exportReconciliation();
  }

  @Post('batch-sync')
  @Header('Cache-Control', 'no-store')
  batchSync(@Request() req: any, @Body() body: { tenantIds: string[] }) {
    this.assertSetupPin(req);
    return this.leadgerService.enqueueBatchSync(body?.tenantIds ?? []);
  }

  @Get('outbox')
  @Header('Cache-Control', 'no-store')
  listOutbox(@Request() req: any, @Query('status') status?: string) {
    this.assertSetupPin(req);
    return this.leadgerService.listOutbox(status);
  }

  @Post('outbox/:id/retry')
  @Header('Cache-Control', 'no-store')
  retryOutbox(@Request() req: any, @Param('id') id: string) {
    this.assertSetupPin(req);
    return this.leadgerService.retryOutboxEvent(id);
  }

  @Post('outbox/process-now')
  @Header('Cache-Control', 'no-store')
  processNow(@Request() req: any) {
    this.assertSetupPin(req);
    return this.leadgerService.processOutboxBatch(20);
  }
}
