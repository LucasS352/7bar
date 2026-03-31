import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.customersService.findAll(user.tenantId, user.databaseUrl);
  }

  @Get('phone/:phone')
  findByPhone(@CurrentUser() user: any, @Param('phone') phone: string) {
    return this.customersService.findByPhone(user.tenantId, user.databaseUrl, phone);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.customersService.create(user.tenantId, user.databaseUrl, body);
  }
}
