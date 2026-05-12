import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

import { ProvisionTenantDto } from './provision-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private heartPrisma: HeartPrismaService,
    private tenantManager: TenantConnectionManager,
  ) {}

  findAll() {
    return this.heartPrisma.tenant.findMany({ include: { users: true } });
  }

  create(data: any) {
    return this.heartPrisma.tenant.create({ data });
  }

  async findById(tenantId: string) {
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    
    // Remover o certificado (blob) por segurança
    const { certPfx, ...safeTenant } = tenant as any;
    return safeTenant;
  }

  async updateTenant(tenantId: string, data: any) {
    // Campos permitidos (whitelist — nunca atualizar certPfx por aqui)
    const allowed = [
      'razaoSocial', 'nomeFantasia', 'cnpj', 'ie', 'im', 'crt',
      'logradouro', 'numero', 'complemento', 'bairro',
      'municipio', 'codMunicipio', 'uf', 'cep', 'telefone',
      'nfceAtivo', 'nfceSerie', 'nfceAmbiente', 'nfceCsc', 'nfceIdCsc',
      'modulos', 'status'
    ];
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    return this.heartPrisma.tenant.update({
      where: { id: tenantId },
      data: safeData,
    });
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    const fs = require('fs');
    const crypto = require('crypto');
    
    const dir = path.join(process.cwd(), 'uploads', 'logos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const ext = path.extname(file.originalname);
    const filename = `${tenantId}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(dir, filename);
    
    fs.writeFileSync(filePath, file.buffer);
    
    const logoUrl = `/api/tenants/uploads/logos/${filename}`;
    
    return this.heartPrisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
    }).then(() => ({ message: 'Logo atualizado com sucesso.', logoUrl }));
  }

  async uploadCertificado(tenantId: string, pfxBuffer: Buffer, senha: string) {
    // Extrair validade do certificado via parsing básico (DER)
    // Por ora, armazenamos sem validar — o PHP valida ao emitir
    return this.heartPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        certPfx: Buffer.from(pfxBuffer),
        certSenha: senha,
        certValidade: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Validade provisória para o painel reconhecer
      },
    }).then(() => ({ message: 'Certificado armazenado com sucesso.' }));
  }

  async validatePin(pin: string): Promise<boolean> {
    const setupPin = process.env.SETUP_PIN;
    if (!setupPin) throw new BadRequestException('SETUP_PIN não configurado no servidor.');
    return pin === setupPin;
  }

  async provisionTenant(dto: ProvisionTenantDto) {
    const { pin, tenantName, dbName, adminName, adminEmail, adminPassword, seedProducts } = dto;

    // 1. Validar PIN
    const pinValid = await this.validatePin(pin);
    if (!pinValid) {
      throw new UnauthorizedException('PIN inválido. Acesso negado.');
    }

    // 2. Sanitizar nome do banco (apenas letras, números e _)
    const sanitizedDbName = dbName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    if (!sanitizedDbName) {
      throw new BadRequestException('Nome do banco inválido após sanitização.');
    }

    // 3. Verificar se tenant já existe
    const existingTenant = await this.heartPrisma.tenant.findFirst({
      where: { databaseName: sanitizedDbName },
    });
    if (existingTenant) {
      throw new BadRequestException(`Já existe um tenant com o banco "${sanitizedDbName}".`);
    }

    // 4. Verificar se email já existe
    const existingUser = await this.heartPrisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException(`Já existe um usuário com o email "${adminEmail}".`);
    }

    // 5. Criar o banco de dados via SQL raw
    await this.heartPrisma.$queryRawUnsafe(
      `CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );

    // 6. Montar a DATABASE_URL para o novo tenant
    const baseUrl = process.env.DATABASE_URL_HEART || '';
    // Substituir apenas o nome do banco no final da URL
    const tenantDbUrl = baseUrl.replace(/\/[^/]+$/, `/${sanitizedDbName}`);

    // 7. Rodar migrations Prisma no novo banco
    try {
      const prismaSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
      await execAsync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate --accept-data-loss`, {
        env: {
          ...process.env,
          DATABASE_URL_TENANT: tenantDbUrl,
        },
        timeout: 60000,
      });
    } catch (err: any) {
      // Tentar limpar banco criado se migrate falhar
      await this.heartPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS \`${sanitizedDbName}\``);
      this.logger.error(`Erro no provisionamento (db push) do tenant ${tenantName}: ${err.stdout} ${err.stderr}`);
      throw new BadRequestException('Erro ao criar tabelas no novo banco. Detalhe: ' + (err.stderr || err.message));
    }

    // 8. Criar tenant + admin no banco heart (dentro de uma transaction)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const tenant = await this.heartPrisma.tenant.create({
      data: {
        name: tenantName,
        databaseName: sanitizedDbName,
        databaseUrl: tenantDbUrl,
        status: 'active',
        users: {
          create: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
          },
        },
      },
      include: { users: true },
    });

    // 9. Popular produtos base no novo banco do tenant (se solicitado)
    if (seedProducts !== false) {
      try {
        await this.seedTenantProducts(tenantDbUrl);
      } catch (err) {
        // Seed falhou mas não desfaz — o sistema funciona sem produtos, admins podem cadastrar manualmente
        this.logger.warn(`Aviso: seed de produtos para ${tenantName} falhou: ${err.message}`);
      }
    }

    return {
      message: `Tenant "${tenantName}" provisionado com sucesso!`,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        databaseName: tenant.databaseName,
        admin: {
          name: tenant.users[0]?.name,
          email: tenant.users[0]?.email,
          role: tenant.users[0]?.role,
        },
      },
    };
  }

  private async seedTenantProducts(databaseUrl: string) {
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    try {
      await client.$connect();

      const categories = await client.category.createMany({
        data: [
          { name: 'Cervejas' },
          { name: 'Destilados' },
          { name: 'Convenência' },
          { name: 'Energéticos' },
          { name: 'Refrigerantes e Sucos' },
          { name: 'Salgadinhos e Petiscos' },
          { name: 'Chocolates e Balas' },
          { name: 'Copão / Combos' },
          { name: 'Tabacaria' },
        ],
        skipDuplicates: true,
      });

      const allCategories = await client.category.findMany();
      const cat = (name: string) => allCategories.find((c) => c.name === name)!;

      await client.product.createMany({
        data: [
          { name: 'Heineken Long Neck 330ml',               shortCode: '1',  priceSell: 6.90,   priceCost: 4.80,   stock: 120, categoryId: cat('Cervejas').id },
          { name: 'Heineken Latão 473ml',                   shortCode: '2',  priceSell: 7.50,   priceCost: 5.50,   stock: 100, categoryId: cat('Cervejas').id },
          { name: 'Brahma Duplo Malte Latão 473ml',         shortCode: '3',  priceSell: 4.90,   priceCost: 3.20,   stock: 300, categoryId: cat('Cervejas').id },
          { name: 'Brahma Chopp Lata 350ml',                shortCode: '4',  priceSell: 3.50,   priceCost: 2.20,   stock: 150, categoryId: cat('Cervejas').id },
          { name: 'Amstel Latão 473ml',                     shortCode: '5',  priceSell: 4.80,   priceCost: 3.50,   stock: 120, categoryId: cat('Cervejas').id },
          { name: 'Spaten Long Neck 355ml',                 shortCode: '6',  priceSell: 5.90,   priceCost: 4.00,   stock: 90,  categoryId: cat('Cervejas').id },
          { name: 'Stella Artois Long Neck 330ml',          shortCode: '7',  priceSell: 7.50,   priceCost: 5.50,   stock: 40,  categoryId: cat('Cervejas').id },
          { name: 'Corona Long Neck 330ml',                 shortCode: '8',  priceSell: 6.90,   priceCost: 4.90,   stock: 60,  categoryId: cat('Cervejas').id },
          { name: 'Skol Lata 350ml',                        shortCode: '9',  priceSell: 3.20,   priceCost: 2.00,   stock: 250, categoryId: cat('Cervejas').id },
          { name: 'Absolut Vodka 1L',                       shortCode: '10', priceSell: 95.00,  priceCost: 65.00,  stock: 15,  categoryId: cat('Destilados').id },
          { name: 'Smirnoff Vodka 998ml',                   shortCode: '11', priceSell: 49.90,  priceCost: 35.00,  stock: 30,  categoryId: cat('Destilados').id },
          { name: 'Johnnie Walker Red Label 1L',            shortCode: '12', priceSell: 109.90, priceCost: 80.00,  stock: 20,  categoryId: cat('Destilados').id },
          { name: 'Jack Daniels No. 7 1L',                  shortCode: '13', priceSell: 159.90, priceCost: 110.00, stock: 10,  categoryId: cat('Destilados').id },
          { name: 'Gin Tanqueray 750ml',                    shortCode: '14', priceSell: 139.90, priceCost: 95.00,  stock: 12,  categoryId: cat('Destilados').id },
          { name: 'Cachaça 51 965ml',                       shortCode: '15', priceSell: 14.00,  priceCost: 8.50,   stock: 40,  categoryId: cat('Destilados').id },
          { name: 'Tequila Jose Cuervo 750ml',              shortCode: '16', priceSell: 129.90, priceCost: 90.00,  stock: 15,  categoryId: cat('Destilados').id },
          { name: 'Red Bull Lata 250ml',                    shortCode: '17', priceSell: 9.90,   priceCost: 6.90,   stock: 80,  categoryId: cat('Energéticos').id },
          { name: 'Monster Energy 473ml',                   shortCode: '18', priceSell: 11.90,  priceCost: 8.50,   stock: 50,  categoryId: cat('Energéticos').id },
          { name: 'Baly Tradicional 2L',                    shortCode: '19', priceSell: 15.00,  priceCost: 10.00,  stock: 40,  categoryId: cat('Energéticos').id },
          { name: 'Coca-Cola 2L',                           shortCode: '20', priceSell: 11.00,  priceCost: 7.50,   stock: 60,  categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Guaraná Antarctica 2L',                  shortCode: '21', priceSell: 8.50,   priceCost: 5.50,   stock: 70,  categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Coca-Cola Lata 350ml',                   shortCode: '22', priceSell: 5.00,   priceCost: 3.20,   stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Água Mineral s/ Gás 500ml',              shortCode: '23', priceSell: 2.00,   priceCost: 0.80,   stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Ruffles Original 76g',                   shortCode: '24', priceSell: 8.50,   priceCost: 5.50,   stock: 30,  categoryId: cat('Salgadinhos e Petiscos').id },
          { name: 'Doritos Queijo Nacho 76g',               shortCode: '25', priceSell: 8.50,   priceCost: 5.50,   stock: 35,  categoryId: cat('Salgadinhos e Petiscos').id },
          { name: 'Gelo Escama 5kg',                        shortCode: '26', priceSell: 12.00,  priceCost: 6.00,   stock: 30,  categoryId: cat('Convenência').id },
          { name: 'Copo Descartável 400ml (50 un)',          shortCode: '27', priceSell: 10.00,  priceCost: 6.00,   stock: 25,  categoryId: cat('Convenência').id },
          { name: 'Combo: Vodka Smirnoff + Baly 2L + Gelo', shortCode: '28', priceSell: 68.00,  priceCost: 48.00,  stock: 50,  categoryId: cat('Copão / Combos').id },
          { name: 'Copão: Vodka e Energético 500ml',         shortCode: '29', priceSell: 15.00,  priceCost: 7.00,   stock: 200, categoryId: cat('Copão / Combos').id },
          { name: 'Cigarro Marlboro Vermelho',               shortCode: '30', priceSell: 12.50,  priceCost: 10.00,  stock: 50,  categoryId: cat('Tabacaria').id },
          { name: 'Isqueiro Bic',                           shortCode: '31', priceSell: 6.00,   priceCost: 3.50,   stock: 80,  categoryId: cat('Tabacaria').id },
        ],
        skipDuplicates: true,
      });

      this.logger.log(`✅ Produtos base populados no banco: ${databaseUrl}`);
    } finally {
      await client.$disconnect();
    }
  }

  /** Define/atualiza o PIN de desconto do PDV (armazenado na tabela tenant_settings do banco do tenant) */
  async setDiscountPin(tenantId: string, databaseUrl: string, pin: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const hashed = await bcrypt.hash(pin, 10);
    await prisma.tenantSettings.upsert({
      where: { id: 'singleton' },
      update: { discountPin: hashed },
      create: { id: 'singleton', discountPin: hashed },
    });
    return { message: 'PIN de desconto configurado com sucesso.' };
  }

  /** Verifica se o PIN de desconto é válido */
  async verifyDiscountPin(tenantId: string, databaseUrl: string, pin: string): Promise<boolean> {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const settings = await prisma.tenantSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings?.discountPin) return false;
    return bcrypt.compare(pin, settings.discountPin);
  }
}
