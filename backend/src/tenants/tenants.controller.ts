import { Controller, Get, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      throw new UnauthorizedException('Somente admins podem listar empresas SaaS');
    }
    return this.tenantsService.findAll();
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    if (user.role !== 'superadmin') {
      throw new UnauthorizedException('Somente superadmins podem criar empresas SaaS');
    }
    return this.tenantsService.create(body);
  }
}
