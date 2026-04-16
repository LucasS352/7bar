import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private heartPrisma: HeartPrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.heartPrisma.user.findUnique({
      where: { email },
      include: { tenant: true },
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

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant.id,
      databaseUrl: user.tenant.database_url,
      role: user.role
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        tenant: user.tenant.name
      }
    };
  }

  /**
   * Troca de usuário por PIN no PDV.
   * Busca todos os usuários do mesmo tenant e compara o PIN digitado.
   */
  async switchByPin(pin: string, tenantId: string): Promise<any> {
    const users = await this.heartPrisma.user.findMany({
      where: { tenantId, active: true, pin: { not: null } },
      include: { tenant: true },
    });

    const matched = users.find(u => u.pin === pin);

    if (!matched) {
      throw new UnauthorizedException('PIN inválido ou usuário não encontrado.');
    }

    const { password, pin: _pin, ...result } = matched;
    return this.login(result);
  }

  async setPin(userId: string, pin: string): Promise<void> {
    await this.heartPrisma.user.update({
      where: { id: userId },
      data: { pin },
    });
  }
}
