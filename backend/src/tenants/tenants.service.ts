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

  async migrateTenants(tenantIds: string[]): Promise<any[]> {
    const results: any[] = [];
    const tenants = await this.heartPrisma.tenant.findMany({
      where: { id: { in: tenantIds } }
    });

    for (const tenant of tenants) {
      this.logger.log(`[Migracao] Iniciando atualizacao de schema do tenant: ${tenant.name} (${tenant.databaseName})`);
      
      // 1. Limpeza de chaves orfas pre-migracao
      const TenantPrismaClient = require('@prisma/client').PrismaClient;
      const tenantPrisma = new TenantPrismaClient({
        datasources: { db: { url: tenant.databaseUrl } }
      });

      try {
        await tenantPrisma.$executeRawUnsafe(`UPDATE sales SET operatorId = NULL`).catch(() => {});
        await tenantPrisma.$executeRawUnsafe(`UPDATE cash_registers SET operatorId = NULL`).catch(() => {});
      } catch (e: any) {
        this.logger.warn(`Aviso na limpeza pre-migracao de ${tenant.name}: ${e.message}`);
      } finally {
        await tenantPrisma.$disconnect();
      }

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

      this.logger.log(`⏳ Buscando produtos essenciais na Base Mestre para o tenant...`);

      const targetCategories = [
        'Cerveja Lata', 'Cerveja Long Neck', 'Cerveja Garrafa', 
        'Refrigerante Lata', 'Energético', 
        'Salgadinho Elma Chips', 'Salgadinho', 
        'Cachaça', 'Whisky', 'Vodka', 'Gin', 
        'Vinho', 'Vinho Tinto', 
        'Isqueiro', 'Gelo', 'Fósforo', 
        'Detergente Líquido', 'Corote', 'Conhaque', 
        'Água Mineral', 'Água Tônica'
      ];

      // Busca até 1500 produtos dessas categorias na base mestre
      const masterProducts = await this.heartPrisma.masterProduct.findMany({
        where: {
          category: { in: targetCategories }
        },
        take: 1500,
        orderBy: { category: 'asc' }
      });

      if (masterProducts.length === 0) {
        this.logger.warn(`Aviso: Nenhum produto encontrado na Base Mestre para o seed inicial.`);
        return;
      }

      this.logger.log(`✅ ${masterProducts.length} produtos encontrados na Base Mestre. Injetando no Tenant...`);

      // Extrai categorias únicas e cadastra no banco do Tenant
      const uniqueCategories = [...new Set(masterProducts.map(p => p.category).filter(Boolean))];
      
      await client.category.createMany({
        data: uniqueCategories.map(name => ({ name: name as string })),
        skipDuplicates: true,
      });

      const tenantCategories = await client.category.findMany();
      const getCatId = (name: string | null) => {
        if (!name) return undefined;
        return tenantCategories.find(c => c.name === name)?.id;
      };

      // Mapeia os produtos para inserção
      const productsData = masterProducts.map((p, index) => {
        const catId = getCatId(p.category);
        if (!catId) return null; // Ignora se não houver categoria (improvável)

        return {
          name: p.name + (p.brand ? ` - ${p.brand}` : ''),
          shortCode: (index + 1).toString(), // Gera códigos curtos sequenciais de 1 a 1500
          barcode: p.ean || null,
          priceCost: 0,
          priceSell: 0,
          stock: 0,
          categoryId: catId,
          imageUrl: p.imageUrl || null,
          ncm: p.ncm || null,
          cest: p.cest || null,
          active: true,
          unit: 'UN'
        };
      }).filter(Boolean);

      // Insere em lotes caso seja muito grande
      const batchSize = 500;
      for (let i = 0; i < productsData.length; i += batchSize) {
        const batch = productsData.slice(i, i + batchSize);
        await client.product.createMany({
          data: batch as any,
          skipDuplicates: true,
        });
      }

      this.logger.log(`✅ Produtos base populados com SUCESSO no banco: ${databaseUrl}`);
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
}
