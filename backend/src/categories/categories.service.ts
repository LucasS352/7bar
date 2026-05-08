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

  async update(tenantId: string, databaseUrl: string, id: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.category.update({ where: { id }, data });
  }

  async remove(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    // Check if category has products
    const products = await prisma.product.findFirst({ where: { categoryId: id } });
    if (products) {
      throw new Error('Não é possível excluir uma categoria que possui produtos vinculados.');
    }
    return prisma.category.delete({ where: { id } });
  }
}
