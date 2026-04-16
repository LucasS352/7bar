import { Controller, Post, Body, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.authService.login(user);
  }

  /**
   * Troca de usuário por PIN — usado no PDV sem precisar digitar e-mail.
   * Requer JWT válido (usuário logado) para saber o tenantId.
   */
  @UseGuards(JwtAuthGuard)
  @Post('switch-pin')
  async switchByPin(@Body() body: any, @Request() req: any) {
    const { pin } = body;
    if (!pin) throw new UnauthorizedException('PIN não informado.');
    return this.authService.switchByPin(pin, req.user.tenantId);
  }

  /**
   * Define ou atualiza o PIN do próprio usuário logado.
   */
  @UseGuards(JwtAuthGuard)
  @Post('set-pin')
  async setPin(@Body() body: any, @Request() req: any) {
    const { pin } = body;
    if (!pin || pin.length < 4 || pin.length > 6) {
      throw new UnauthorizedException('O PIN deve ter entre 4 e 6 dígitos.');
    }
    await this.authService.setPin(req.user.sub, pin);
    return { message: 'PIN definido com sucesso.' };
  }
}
