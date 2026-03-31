import { Injectable } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class CustomersService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.customer.findMany();
  }

  async findByPhone(tenantId: string, databaseUrl: string, phone: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.customer.findUnique({ where: { phone } });
  }

  async create(tenantId: string, databaseUrl: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.customer.create({ data });
  }
}
