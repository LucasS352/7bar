import { Injectable } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.category.findMany();
  }

  async create(tenantId: string, databaseUrl: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.category.create({ data });
  }
}
