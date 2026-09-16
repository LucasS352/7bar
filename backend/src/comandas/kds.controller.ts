import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KdsService } from './kds.service';

@Controller('v1/kds')
@UseGuards(JwtAuthGuard)
export class KdsController {
  constructor(private readonly kds: KdsService) {}
  @Get('config') config() {
    return this.kds.config();
  }
  @Get('tickets') tickets() {
    return this.kds.tickets();
  }
  @Patch('status') update(@Body() body: { itemIds: string[]; status: string }) {
    return this.kds.update(body.itemIds, body.status);
  }
}
