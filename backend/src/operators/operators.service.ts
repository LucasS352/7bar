import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OperatorsService {
  constructor(private readonly tenantManager: TenantConnectionManager) {}

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.operator.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const operator = await prisma.operator.findUnique({
      where: { id },
    });
    if (!operator) throw new NotFoundException('Operador não encontrado');
    return operator;
  }

  async create(tenantId: string, databaseUrl: string, data: { name: string; pin: string }) {
    if (!data.pin || data.pin.length < 4 || data.pin.length > 6) {
      throw new BadRequestException('O PIN deve ter entre 4 e 6 dígitos.');
    }
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const hashedPin = await bcrypt.hash(data.pin, 10);
    
    const op = await prisma.operator.create({
      data: {
        name: data.name,
        pin: hashedPin,
        active: true,
      },
    });
    
    // remove pin from return
    const { pin, ...result } = op;
    return result;
  }

  async update(tenantId: string, databaseUrl: string, id: string, data: { name?: string; pin?: string; active?: boolean }) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    
    if (data.pin) {
      if (data.pin.length < 4 || data.pin.length > 6) {
        throw new BadRequestException('O PIN deve ter entre 4 e 6 dígitos.');
      }
      updateData.pin = await bcrypt.hash(data.pin, 10);
    }

    try {
      const op = await prisma.operator.update({
        where: { id },
        data: updateData,
      });
      const { pin, ...result } = op;
      return result;
    } catch (e) {
      throw new NotFoundException('Operador não encontrado');
    }
  }

  async remove(tenantId: string, databaseUrl: string, id: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    try {
      await prisma.operator.delete({
        where: { id },
      });
      return { success: true };
    } catch (e) {
      throw new NotFoundException('Operador não encontrado');
    }
  }
}
