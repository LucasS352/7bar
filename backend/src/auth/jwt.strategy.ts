import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Idealmente num arquivo .env
export const jwtConstants = {
  secret: '7bar-super-secret-key-321', 
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

  async validate(payload: any) {
    // Esse objeto ficará disponível em 'req.user' nas rotas protegidas!
    return { 
      userId: payload.sub, 
      email: payload.email, 
      tenantId: payload.tenantId,
      databaseUrl: payload.databaseUrl,
      role: payload.role
    };
  }
}
