import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
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
    private tenantContext: TenantContextService
  ) {}

  findAll() {
    return this.heartPrisma.tenant.findMany({ include: { users: true, tenantIntegrations: true } });
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

    try {
      const tenantPrisma = await this.tenantManager.getTenantClient(tenantId, tenant.databaseUrl);
      const numeracao = await tenantPrisma.numeracaoNfce.findUnique({
        where: { serie: tenant.nfceSerie || 1 }
      });
      safeTenant.proximaNota = (numeracao?.ultimo ?? 0) + 1;
    } catch (e: any) {
      this.logger.warn(`Não foi possível carregar a numeração da NFC-e para o tenant ${tenantId}: ${e.message}`);
      safeTenant.proximaNota = 1;
    }

    return safeTenant;
  }

  async updateTenant(tenantId: string, data: any) {
    // Campos permitidos (whitelist — nunca atualizar certPfx por aqui)
    const allowed = [
      'razaoSocial', 'nomeFantasia', 'cnpj', 'ie', 'im', 'crt',
      'logradouro', 'numero', 'complemento', 'bairro',
      'municipio', 'codMunicipio', 'uf', 'cep', 'telefone',
      'nfceAtivo', 'nfceSerie', 'nfceAmbiente', 'nfceCsc', 'nfceIdCsc',
      'modulos', 'status', 'emailContador', 'mensalidadeValor', 'mensalidadeVencimento'
    ];
    // Tipamos explicitamente como Record<string, any> para evitar erro TS no acesso de chaves dinâmicas
    const safeData: Record<string, any> = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );

    // Tratar tipos numéricos para evitar que strings quebrem o Prisma
    if (safeData.crt != null)          safeData.crt          = Number(safeData.crt);
    if (safeData.nfceSerie != null)    safeData.nfceSerie    = Number(safeData.nfceSerie);
    if (safeData.nfceAmbiente != null) safeData.nfceAmbiente = Number(safeData.nfceAmbiente);
    if (safeData.mensalidadeValor != null) {
      safeData.mensalidadeValor = Number(safeData.mensalidadeValor);
    }
    if (safeData.mensalidadeVencimento !== undefined) {
      safeData.mensalidadeVencimento = safeData.mensalidadeVencimento ? new Date(safeData.mensalidadeVencimento) : null;
    }

    // Normalizar CNPJ: remove pontuação e verifica duplicidade em outros tenants
    if (safeData.cnpj) {
      const cleanCnpj = String(safeData.cnpj).replace(/\D/g, '');
      const duplicate = await this.heartPrisma.tenant.findFirst({
        where: { cnpj: cleanCnpj, id: { not: tenantId } }
      });

      if (duplicate) {
        // Em ambiente de desenvolvimento pode haver CNPJs duplicados de testes — ignoramos silenciosamente
        this.logger.warn(
          `[Ambiente de Testes] CNPJ ${data.cnpj} já pertence à empresa "${duplicate.razaoSocial || duplicate.name}". ` +
          'CNPJ não atualizado. Demais campos serão salvos normalmente.'
        );
        delete safeData.cnpj;
      } else {
        safeData.cnpj = cleanCnpj;
      }
    }

    // Atualizar proximaNota no banco específico do tenant se fornecido
    if (data.proximaNota !== undefined) {
      const proxima = Number(data.proximaNota);
      if (!isNaN(proxima) && proxima > 0) {
        try {
          const tenant = await this.heartPrisma.tenant.findUnique({
            where: { id: tenantId },
          });
          if (tenant) {
            const serie = safeData.nfceSerie !== undefined ? Number(safeData.nfceSerie) : (tenant.nfceSerie || 1);
            const tenantPrisma = await this.tenantManager.getTenantClient(tenantId, tenant.databaseUrl);
            await tenantPrisma.numeracaoNfce.upsert({
              where: { serie },
              update: { ultimo: proxima - 1 },
              create: { serie, ultimo: proxima - 1 }
            });
          }
        } catch (dbErr: any) {
          this.logger.error(`Erro ao atualizar proximaNota para tenant ${tenantId}: ${dbErr.message}`);
        }
      }
    }

    try {
      return await this.heartPrisma.tenant.update({
        where: { id: tenantId },
        data: safeData,
      });
    } catch (err: any) {
      this.logger.error(`Erro ao atualizar tenant ${tenantId}: ${err.message}`, err.stack);
      throw new BadRequestException(`Erro ao salvar dados no banco: ${err.message}`);
    }
  }

  async getLogoImage(id: string) {
    return this.heartPrisma.image.findUnique({ where: { id } });
  }

  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    const image = await this.heartPrisma.image.create({
      data: {
        data: Buffer.from(file.buffer),
        mimeType: file.mimetype,
      }
    });
    
    const logoUrl = `/api/tenants/uploads/logos/${image.id}`;
    
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

  async migrateTenants(tenantIds: string[]): Promise<any[]> {
    const results: any[] = [];
    const tenants = await this.heartPrisma.tenant.findMany({
      where: { id: { in: tenantIds } }
    });

    for (const tenant of tenants) {
      this.logger.log(`[Migracao] Iniciando atualizacao de schema do tenant: ${tenant.name} (${tenant.databaseName})`);
      
      // Nota: removida limpeza de operatorId que fechava os caixas abertos.
      // O db push com --accept-data-loss trata mudanças de schema sem precisar disso.

      // 2. Executar db push
      try {
        const prismaSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
        const { stdout, stderr } = await execAsync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate --accept-data-loss`, {
          env: {
            ...process.env,
            DATABASE_URL_TENANT: tenant.databaseUrl,
          },
          timeout: 60000,
        });

        results.push({
          tenantId: tenant.id,
          name: tenant.name,
          databaseName: tenant.databaseName,
          status: 'success',
          output: stdout || 'Schema atualizado com sucesso.'
        });
      } catch (err: any) {
        this.logger.error(`Erro ao rodar migracao em ${tenant.name}: ${err.message}`);
        results.push({
          tenantId: tenant.id,
          name: tenant.name,
          databaseName: tenant.databaseName,
          status: 'error',
          output: `Erro na migracao:\n${err.stderr || err.message}\n${err.stdout || ''}`
        });
      }
    }

    return results;
  }

  async getTenantCategories(tenantId: string) {
    const tenant = await this.heartPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.databaseUrl) return [];
    
    try {
      const tenantPrisma = await this.tenantManager.getTenantClient(tenantId, tenant.databaseUrl);
      return await tenantPrisma.category.findMany({ orderBy: { name: 'asc' } });
    } catch (e: any) {
      this.logger.error(`Erro ao buscar categorias do tenant ${tenantId}: ${e.message}`);
      return [];
    }
  }

  async provisionTenant(dto: ProvisionTenantDto) {
    const { pin, tenantName, dbName, adminName, adminEmail, adminPassword, seedProducts, mensalidadeValor, mensalidadeVencimento } = dto;

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
        mensalidadeValor: mensalidadeValor != null ? Number(mensalidadeValor) : 0,
        mensalidadeVencimento: mensalidadeVencimento ? new Date(mensalidadeVencimento) : null,
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
      this.logger.log(`⏳ Injetando catálogo curado de Disk Bebidas no tenant...`);

      // ─── Catálogo curado — apenas os produtos que REALMENTE vendem em Disk ───
      // Preços zerados: o cliente configura pela tela de Edição em Massa
      const diskProducts = [
        // ── CERVEJAS ──────────────────────────────────────────────────────────
        { name: 'Heineken Long Neck 330ml',          ean: '7896045506873', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Heineken Latão 473ml',              ean: '7896045503667', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Heineken Puro Malte Lata 350ml',    ean: '7896045503728', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Budweiser Lata 350ml',              ean: '7891991010931', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Budweiser Long Neck 330ml',         ean: '7891991011723', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Brahma Duplo Malte Latão 473ml',    ean: '7891149408537', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Brahma Duplo Malte Lata 350ml',     ean: '7891149408001', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Brahma Chopp Lata 350ml',           ean: '7891149102181', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Skol Pilsen Lata 350ml',            ean: '7891149103102', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Skol Pilsen Latão 473ml',           ean: '7891149103904', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Amstel Lata 350ml',                 ean: '7896045505609', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Amstel Latão 473ml',                ean: '7896045505920', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Spaten Lager Latão 473ml',          ean: '7896045508877', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Spaten Long Neck 355ml',            ean: '7896045508853', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Corona Long Neck 330ml',            ean: '7501064144427', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Stella Artois Long Neck 330ml',     ean: '7891149150700', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Itaipava Lata 350ml',               ean: '7897395020101', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Itaipava Latão 473ml',              ean: '7897395020217', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },
        { name: 'Bohemia Puro Malte Long Neck 350ml',ean: '7891149174003', ncm: '22030000', cest: '0300100', cat: 'Cervejas' },

        // ── DESTILADOS ─────────────────────────────────────────────────────────
        { name: 'Vodka Smirnoff 998ml',              ean: '5000067022795', ncm: '22084000', cest: '0300600', cat: 'Destilados' },
        { name: 'Vodka Smirnoff 600ml',              ean: '5000067000120', ncm: '22084000', cest: '0300600', cat: 'Destilados' },
        { name: 'Vodka Absolut 750ml',               ean: '7312040017072', ncm: '22084000', cest: '0300600', cat: 'Destilados' },
        { name: 'Gin Tanqueray 750ml',               ean: '5000281002161', ncm: '22085000', cest: '0300600', cat: 'Destilados' },
        { name: 'Gin Gordon\'s 750ml',               ean: '5000289019022', ncm: '22085000', cest: '0300600', cat: 'Destilados' },
        { name: 'Whisky JW Red Label 1L',            ean: '5000267014159', ncm: '22083000', cest: '0300600', cat: 'Destilados' },
        { name: 'Whisky JW Black Label 1L',          ean: '5000267024448', ncm: '22083000', cest: '0300600', cat: 'Destilados' },
        { name: 'Whisky Jack Daniels 1L',            ean: '5099873003701', ncm: '22083000', cest: '0300600', cat: 'Destilados' },
        { name: 'Cachaça 51 965ml',                  ean: '7891050000513', ncm: '22087000', cest: '0300600', cat: 'Destilados' },
        { name: 'Campari 900ml',                     ean: '8001110055903', ncm: '22089000', cest: '0300600', cat: 'Destilados' },
        { name: 'Aperol 1L',                         ean: '8001110902209', ncm: '22089000', cest: '0300600', cat: 'Destilados' },

        // ── ENERGÉTICOS ────────────────────────────────────────────────────────
        { name: 'Red Bull Energy Drink 250ml',       ean: '9002490100070', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Red Bull Tropical 250ml',           ean: '9002490259427', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Red Bull Melancia 250ml',           ean: '9002490256648', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Monster Energy Green 473ml',        ean: '5060466511344', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Monster Mango Loco 473ml',          ean: '5060466511382', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Baly Tradicional 2L',               ean: '7898381900037', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },
        { name: 'Baly Morango 2L',                   ean: '7898381900068', ncm: '22021000', cest: '0300200', cat: 'Energéticos' },

        // ── REFRIGERANTES ──────────────────────────────────────────────────────
        { name: 'Coca-Cola 2L',                      ean: '7894900011517', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Coca-Cola 1L',                      ean: '7894900011500', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Coca-Cola Lata 350ml',              ean: '7894900700824', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Guaraná Antarctica 2L',             ean: '7891149001008', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Guaraná Antarctica Lata 350ml',     ean: '7891149400716', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Sprite 2L',                         ean: '7894900011555', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Fanta Laranja 2L',                  ean: '7894900011531', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Schweppes Citrus 350ml',            ean: '7896020100157', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },
        { name: 'Schweppes Tônica 350ml',            ean: '7896020100133', ncm: '22021000', cest: '0300200', cat: 'Refrigerantes' },

        // ── ÁGUA E SUCOS ───────────────────────────────────────────────────────
        { name: 'Água Mineral s/ Gás 500ml',         ean: '7896102105025', ncm: '22011000', cest: '0300300', cat: 'Água e Sucos' },
        { name: 'Água Mineral c/ Gás 500ml',         ean: '7896102100174', ncm: '22011000', cest: '0300300', cat: 'Água e Sucos' },
        { name: 'Água Mineral 1,5L',                 ean: '7896102107104', ncm: '22011000', cest: '0300300', cat: 'Água e Sucos' },
        { name: 'Suco Del Valle Uva 1L',             ean: '7894900700701', ncm: '20099000', cest: '0300200', cat: 'Água e Sucos' },
        { name: 'Suco Del Valle Pêssego 1L',         ean: '7894900700718', ncm: '20099000', cest: '0300200', cat: 'Água e Sucos' },
        { name: 'Suco Tropicana 1L',                 ean: '7891991220021', ncm: '20099000', cest: '0300200', cat: 'Água e Sucos' },

        // ── CONVENIÊNCIA ───────────────────────────────────────────────────────
        { name: 'Gelo em Escamas 5kg',               ean: '', ncm: '22011000', cest: '',        cat: 'Conveniência' },
        { name: 'Carvão 3kg',                        ean: '', ncm: '44029000', cest: '',        cat: 'Conveniência' },
        { name: 'Copo Descartável 300ml (50un)',      ean: '', ncm: '39241000', cest: '',        cat: 'Conveniência' },
        { name: 'Copo Descartável 400ml (50un)',      ean: '', ncm: '39241000', cest: '',        cat: 'Conveniência' },
        { name: 'Guardanapo Pacote',                 ean: '', ncm: '48189000', cest: '',        cat: 'Conveniência' },
        { name: 'Isqueiro BIC',                      ean: '', ncm: '96131000', cest: '',        cat: 'Conveniência' },

        // ── TABACARIA ──────────────────────────────────────────────────────────
        { name: 'Cigarro Marlboro Vermelho',         ean: '', ncm: '24022000', cest: '0300700', cat: 'Tabacaria' },
        { name: 'Cigarro Marlboro Gold',             ean: '', ncm: '24022000', cest: '0300700', cat: 'Tabacaria' },
        { name: 'Cigarro Philip Morris',             ean: '', ncm: '24022000', cest: '0300700', cat: 'Tabacaria' },

        // ── PETISCOS ───────────────────────────────────────────────────────────
        { name: 'Amendoim Japonês 200g',             ean: '', ncm: '20081900', cest: '',        cat: 'Petiscos' },
        { name: 'Ruffles Original 76g',              ean: '', ncm: '19059000', cest: '',        cat: 'Petiscos' },
        { name: 'Doritos Queijo 76g',                ean: '', ncm: '19059000', cest: '',        cat: 'Petiscos' },
        { name: 'Pringles Original 114g',            ean: '', ncm: '19059000', cest: '',        cat: 'Petiscos' },
        { name: 'Trident Menta c/21',                ean: '', ncm: '17049000', cest: '',        cat: 'Petiscos' },
      ];

      // Tenta enriquecer com imagem da base mestre quando tiver EAN
      const eans = diskProducts.map(p => p.ean).filter(Boolean);
      const masterMap = new Map<string, { imageUrl?: string | null }>();
      if (eans.length > 0) {
        const masterHits = await this.heartPrisma.masterProduct.findMany({
          where: { ean: { in: eans as string[] } },
          select: { ean: true, imageUrl: true },
        });
        for (const m of masterHits) {
          if (m.ean) masterMap.set(m.ean, m);
        }
      }

      // Cria categorias únicas
      const uniqueCats = [...new Set(diskProducts.map(p => p.cat))];
      await client.category.createMany({
        data: uniqueCats.map(name => ({ name })),
        skipDuplicates: true,
      });
      const tenantCategories = await client.category.findMany();
      const getCatId = (name: string) => tenantCategories.find(c => c.name === name)?.id;

      // Insere produtos (pula duplicados por nome)
      let inserted = 0;
      for (const p of diskProducts) {
        const catId = getCatId(p.cat);
        if (!catId) continue;
        const existing = await client.product.findFirst({ where: { name: p.name } });
        if (existing) continue;

        const masterData = p.ean ? masterMap.get(p.ean) : null;
        await client.product.create({
          data: {
            name: p.name,
            barcode: p.ean || null,
            priceCost: 0,
            priceSell: 0,
            stock: 0,
            categoryId: catId,
            ncm: p.ncm || null,
            cest: p.cest || null,
            active: true,
            unit: 'UN',
            imageUrl: masterData?.imageUrl || null,
          },
        });
        inserted++;
      }

      this.logger.log(`✅ Catálogo Disk inserido: ${inserted} produtos no banco ${databaseUrl}`);
    } catch (err) {
      this.logger.error(`❌ Erro ao popular produtos base: ${err.message}`, err.stack);
      throw err;
    } finally {
      await client.$disconnect();
    }
  }

  /** Define/atualiza o PIN de desconto do PDV (armazenado na tabela tenant_settings do banco do tenant) */
  async setDiscountPin(tenantId: string, pin: string) {
    const { databaseUrl } = this.tenantContext.get();
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
  async verifyDiscountPin(tenantId: string, pin: string): Promise<boolean> {
    const { databaseUrl } = this.tenantContext.get();
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const settings = await prisma.tenantSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings?.discountPin) return false;
    return bcrypt.compare(pin, settings.discountPin);
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    // 1. Drop the tenant's database
    try {
      this.logger.log(`⚠️ Excluindo banco de dados: ${tenant.databaseName}`);
      await this.heartPrisma.$executeRawUnsafe(`DROP DATABASE \`${tenant.databaseName}\``);
      this.logger.log(`✅ Banco de dados ${tenant.databaseName} excluído com sucesso.`);
    } catch (e: any) {
      this.logger.error(`Falha ao excluir o banco de dados ${tenant.databaseName}: ${e.message}`);
      // Continuamos a exclusão do registro mesmo se o banco já não existir para evitar bloqueios
    }

    // 2. Delete the tenant record in the heart database
    await this.heartPrisma.tenant.delete({
      where: { id: tenantId }
    });

    return { success: true };
  }

  async registrarPagamento(tenantId: string) {
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { id: tenantId }
    });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');

    let currentDueDate = tenant.mensalidadeVencimento ? new Date(tenant.mensalidadeVencimento) : new Date();
    const nextDueDate = new Date(currentDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    return this.heartPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        mensalidadeVencimento: nextDueDate
      }
    });
  }

  async getTenantUsers(tenantId: string) {
    const users = await this.heartPrisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      }
    });
    return users;
  }

  async resetUserPassword(tenantId: string, userId: string, newPasswordRaw: string) {
    const user = await this.heartPrisma.user.findFirst({
      where: { id: userId, tenantId }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);
    return this.heartPrisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }

  async resetUserPin(tenantId: string, userId: string, newPin: string) {
    const user = await this.heartPrisma.user.findFirst({
      where: { id: userId, tenantId }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    return this.heartPrisma.user.update({
      where: { id: userId },
      data: { pin: newPin }
    });
  }

  /**
   * Varre todos os tenants ativos e sincroniza produtos com EAN
   * para a tabela master_products do banco heart.
   * Atualiza nome, imagem e dados fiscais se o tenant tiver informações mais ricas.
   */
  async syncMasterCatalogFromTenants(): Promise<{ synced: number; tenants: number; errors: string[] }> {
    const allTenants = await this.heartPrisma.tenant.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, databaseUrl: true },
    });

    let synced = 0;
    let tenantsProcessed = 0;
    const errors: string[] = [];

    for (const tenant of allTenants) {
      if (!tenant.databaseUrl) continue;
      const client = new PrismaClient({
        datasources: { db: { url: tenant.databaseUrl } },
      });

      try {
        await client.$connect();

        // Pega todos os produtos com EAN e imagem ou dados fiscais válidos
        const products = await client.product.findMany({
          where: {
            barcode: { not: null },
            OR: [
              { imageUrl: { not: null } },
              { ncm: { not: null } },
            ],
          },
          select: {
            barcode: true,
            name: true,
            imageUrl: true,
            ncm: true,
            cest: true,
          },
        });

        for (const p of products) {
          if (!p.barcode) continue;

          // Busca se já existe no master
          const existing = await this.heartPrisma.masterProduct.findUnique({
            where: { ean: p.barcode },
          });

          if (!existing) {
            // Cria novo no master
            await this.heartPrisma.masterProduct.create({
              data: {
                ean: p.barcode,
                name: p.name,
                imageUrl: p.imageUrl || null,
                ncm: p.ncm || null,
                cest: (p.cest || null) as string | null,
                source: `tenant:${tenant.name}`,
              },
            });
            synced++;
          } else {
            // Atualiza se o tenant tem imagem e o master não tem, ou tem NCM e o master não
            const needsUpdate =
              (!existing.imageUrl && p.imageUrl) ||
              (!existing.ncm && p.ncm);

            if (needsUpdate) {
              await this.heartPrisma.masterProduct.update({
                where: { ean: p.barcode },
                data: {
                  imageUrl: existing.imageUrl || p.imageUrl || null,
                  ncm: existing.ncm || p.ncm || null,
                  cest: existing.cest || (p.cest as string | null) || null,
                },
              });
              synced++;
            }
          }
        }

        tenantsProcessed++;
        this.logger.log(`✅ Tenant "${tenant.name}": ${products.length} produtos verificados.`);
      } catch (err: any) {
        const msg = `Erro ao processar tenant "${tenant.name}": ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      } finally {
        await client.$disconnect();
      }
    }

    this.logger.log(`🎯 Sincronização completa: ${synced} produtos atualizados em ${tenantsProcessed} tenants.`);
    return { synced, tenants: tenantsProcessed, errors };
  }

}

