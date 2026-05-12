import {
  Controller, Get, Post, Patch, Body, UseGuards, Param, Res,
  UnauthorizedException, Request, UseInterceptors,
  UploadedFile, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantsService } from './tenants.service';
import { ProvisionTenantDto } from './provision-tenant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      throw new UnauthorizedException('Somente admins podem listar empresas SaaS');
    }
    return this.tenantsService.findAll();
  }

  /** Lista tenants protegida por PIN — usada pelo sys-init sem JWT */
  @Get('setup/list')
  async listByPin(@Request() req: any) {
    const pin = req.headers['x-setup-pin'] || req.query['pin'];
    const valid = await this.tenantsService.validatePin(pin);
    if (!valid) throw new UnauthorizedException('PIN inválido.');
    return this.tenantsService.findAll();
  }

  /**
   * Retorna dados completos do tenant do usuário logado (para tela de configurações)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return this.tenantsService.findById(req.user.tenantId);
  }

  /**
   * Atualiza dados textuais da empresa (dados, endereço, NFC-e config)
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Request() req: any, @Body() body: any) {
    if (req.user.role !== 'admin') {
      throw new UnauthorizedException('Somente Gerentes podem alterar configurações da empresa.');
    }
    return this.tenantsService.updateTenant(req.user.tenantId, body);
  }

  /**
   * Atualiza dados textuais de qualquer empresa (para painel sys-init)
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateTenant(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      throw new UnauthorizedException('Permissão negada.');
    }
    return this.tenantsService.updateTenant(id, body);
  }

  /**
   * Upload do certificado A1 (.pfx) — salvo como BLOB
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/certificado')
  @UseInterceptors(FileInterceptor('certPfx'))
  async uploadCertificado(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Permissão negada.');
    }
    if (!file) throw new BadRequestException('Arquivo .pfx não enviado.');
    if (!body.certSenha) throw new BadRequestException('Senha do certificado não informada.');

    return this.tenantsService.uploadCertificado(req.user.tenantId, file.buffer, body.certSenha);
  }

  /**
   * Upload de logotipo para White Label
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      throw new UnauthorizedException('Permissão negada.');
    }
    if (!file) throw new BadRequestException('Arquivo não enviado.');
    
    return this.tenantsService.uploadLogo(id, file);
  }

  @Get('uploads/logos/:filename')
  serveLogo(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads/logos', filename);
    if (!existsSync(filePath)) {
      res.status(404).send('Logo not found');
      return;
    }
    const file = createReadStream(filePath);
    file.pipe(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() body: any) {
    if (req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Somente superadmins podem criar empresas SaaS');
    }
    return this.tenantsService.create(body);
  }

  /** Endpoint público — protegido por PIN via variável de ambiente */
  @Post('setup')
  async setup(@Body() body: ProvisionTenantDto) {
    return this.tenantsService.provisionTenant(body);
  }

  @Post('setup/validate-pin')
  async validatePin(@Body() body: { pin: string }) {
    const valid = await this.tenantsService.validatePin(body.pin);
    if (!valid) throw new UnauthorizedException('PIN inválido.');
    return { valid: true };
  }

  /**
   * Define ou atualiza o PIN de desconto do PDV (apenas admins)
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/discount-pin')
  async setDiscountPin(@Request() req: any, @Body() body: { pin: string }) {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      throw new UnauthorizedException('Apenas admins podem configurar o PIN de desconto.');
    }
    if (!body.pin || body.pin.length < 4) {
      throw new BadRequestException('O PIN deve ter no mínimo 4 caracteres.');
    }
    return this.tenantsService.setDiscountPin(req.user.tenantId, req.user.databaseUrl, body.pin);
  }

  /**
   * Verifica se o PIN de desconto informado é válido (usado pelo PDV)
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/verify-discount-pin')
  async verifyDiscountPin(@Request() req: any, @Body() body: { pin: string }) {
    const valid = await this.tenantsService.verifyDiscountPin(req.user.tenantId, req.user.databaseUrl, body.pin);
    if (!valid) throw new UnauthorizedException('PIN de desconto inválido.');
    return { valid: true };
  }
}
