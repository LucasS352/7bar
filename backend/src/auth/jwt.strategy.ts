import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Interface do payload decodificado do JWT — usado em todos os controllers */
export interface JwtPayload {
  sub: string;        // userId
  email: string;
  tenantId: string;
  databaseUrl: string;
  role: string;
}

/**
 * Secret do JWT: usa env JWT_SECRET em produção,
 * fallback para valor de dev se não estiver definido.
 */
export const jwtConstants = {
  secret: process.env.JWT_SECRET || '7bar-super-secret-key-321',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  /**
   * Retorna o objeto que fica em `req.user` nas rotas protegidas.
   * IMPORTANTE: `sub` é o userId — todos os controllers devem usar `user.sub`.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      databaseUrl: payload.databaseUrl,
      role: payload.role,
    };
  }
}
