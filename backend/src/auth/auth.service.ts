import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';

@Injectable()
export class AuthService {
  constructor(
    private heartPrisma: HeartPrismaService,
    private jwtService: JwtService,
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.heartPrisma.user.findUnique({
      where: { email },
      include: { tenant: true }, // Inclui as conexões do tenant atual!
    });

    if (user && await bcrypt.compare(pass, user.password)) {
      if (!user.active) {
        throw new UnauthorizedException('Sua conta foi inativada pelo administrador.');
      }
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async validateOperatorPin(tenantId: string, operatorId: string, pin: string): Promise<any> {
    const { databaseUrl } = this.tenantContext.get();
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const operator = await prisma.operator.findFirst({
      where: { id: operatorId, active: true },
    });

    if (!operator || !operator.pin) {
      throw new UnauthorizedException('Operador inválido ou PIN não configurado.');
    }

    if (await bcrypt.compare(pin, operator.pin)) {
      return { id: operator.id, name: operator.name, role: 'operator' };
    }
    throw new UnauthorizedException('PIN incorreto.');
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant.id,
      role: user.role
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        tenant: user.tenant.name,
        termsAccepted: !!user.tenant.termsAcceptedAt
      }
    };
  }

  async acceptTerms(tenantId: string) {
    await this.heartPrisma.tenant.update({
      where: { id: tenantId },
      data: { termsAcceptedAt: new Date() }
    });
    return { success: true };
  }
}
