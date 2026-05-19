import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class TributacaoService {
  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService
  ) {}

  private async getPrisma(tenantId: string) {
    const { databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async findAll(tenantId: string) {
    const prisma = await this.getPrisma(tenantId);
    return prisma.grupoTributacao.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const prisma = await this.getPrisma(tenantId);
    const grupo = await prisma.grupoTributacao.findUnique({ where: { id } });
    if (!grupo) throw new NotFoundException(`Grupo tributário ${id} não encontrado.`);
    return grupo;
  }

  async create(tenantId: string, data: any) {
    const prisma = await this.getPrisma(tenantId);
    return prisma.grupoTributacao.create({ data });
  }

  async update(tenantId: string, id: string, data: any) {
    const prisma = await this.getPrisma(tenantId);
    return prisma.grupoTributacao.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const prisma = await this.getPrisma(tenantId);
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
