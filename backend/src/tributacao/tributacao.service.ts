import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';

@Injectable()
export class TributacaoService {
  constructor(private tenantManager: TenantConnectionManager) {}

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.grupoTributacao.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const grupo = await prisma.grupoTributacao.findUnique({ where: { id } });
    if (!grupo) throw new NotFoundException(`Grupo tributário ${id} não encontrado.`);
    return grupo;
  }

  async create(tenantId: string, databaseUrl: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.grupoTributacao.create({ data });
  }

  async update(tenantId: string, databaseUrl: string, id: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.grupoTributacao.update({ where: { id }, data });
  }

  async remove(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    // Verificar se há produtos vinculados
    const count = await prisma.product.count({
      where: { grupoTributacaoId: id },
    });
    if (count > 0) {
      throw new BadRequestException(`Não é possível remover: ${count} produto(s) vinculados a este grupo.`);
    }
    return prisma.grupoTributacao.delete({ where: { id } });
  }
}
