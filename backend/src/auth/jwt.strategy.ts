import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Interface do payload decodificado do JWT — usado em todos os controllers */
export interface JwtPayload {
  sub: string;        // userId
  email: string;
  tenantId: string;
  role: string;
}

/**
 * Secret do JWT: obrigatoriamente definido via env JWT_SECRET.
 * Se não estiver definido, a aplicação falha na inicialização.
 */
export const jwtConstants = {
  secret: process.env.JWT_SECRET,
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
      role: payload.role,
    };
  }
}
