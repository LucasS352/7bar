import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.categoriesService.findAll(user.tenantId, user.databaseUrl);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.categoriesService.create(user.tenantId, user.databaseUrl, body);
  }
}
