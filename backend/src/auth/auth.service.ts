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
}
