import { Controller, Get, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { ProvisionTenantDto } from './provision-tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentUser() user: any) {
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      throw new UnauthorizedException('Somente admins podem listar empresas SaaS');
    }
    return this.tenantsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    if (user.role !== 'superadmin') {
      throw new UnauthorizedException('Somente superadmins podem criar empresas SaaS');
    }
    return this.tenantsService.create(body);
  }

  /**
   * Endpoint público (sem JWT) — protegido por PIN via variável de ambiente.
   * Usado pela tela /sys-init para provisionar novos tenants.
   */
  @Post('setup')
  async setup(@Body() body: ProvisionTenantDto) {
    return this.tenantsService.provisionTenant(body);
  }

  /**
   * Valida o PIN sem criar nada — usado pelo Step 1 do frontend.
   */
  @Post('setup/validate-pin')
  async validatePin(@Body() body: { pin: string }) {
    const valid = await this.tenantsService.validatePin(body.pin);
    if (!valid) {
      throw new UnauthorizedException('PIN inválido.');
    }
    return { valid: true };
  }
}
