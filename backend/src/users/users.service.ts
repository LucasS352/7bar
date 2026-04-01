import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private heartPrisma: HeartPrismaService) {}

  async findAll(tenantId: string) {
    return this.heartPrisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async create(tenantId: string, data: any) {
    // Verificar cota de usuários
    const usersCount = await this.heartPrisma.user.count({
      where: { tenantId }
    });

    if (usersCount >= 2) {
      throw new BadRequestException('Limite atingido: O plano atual permite no máximo 2 usuários por loja (1 Admin e 1 Colaborador).');
    }

    if (data.role === 'admin') {
      const adminCount = await this.heartPrisma.user.count({
        where: { tenantId, role: 'admin' }
      });
      if (adminCount >= 1) {
        throw new BadRequestException('Limite atingido: Já existe 1 Administrador neste sistema.');
      }
    }

    const existingUser = await this.heartPrisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new BadRequestException('Já existe um usuário cadastrado com este e-mail.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.heartPrisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'operator',
        tenantId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      }
    });
  }

  async toggleStatus(tenantId: string, id: string) {
    const user = await this.heartPrisma.user.findFirst({
      where: { id, tenantId }
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.role === 'admin') throw new BadRequestException('Não é possível inativar o Administrador principal.');

    return this.heartPrisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: { id: true, active: true }
    });
  }
}
