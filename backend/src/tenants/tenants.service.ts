import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import * as path from 'path';

import { ProvisionTenantDto } from './provision-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private heartPrisma: HeartPrismaService) {}

  findAll() {
    return this.heartPrisma.tenant.findMany({ include: { users: true } });
  }

  create(data: any) {
    return this.heartPrisma.tenant.create({ data });
  }

  async validatePin(pin: string): Promise<boolean> {
    const setupPin = process.env.SETUP_PIN;
    if (!setupPin) throw new BadRequestException('SETUP_PIN não configurado no servidor.');
    return pin === setupPin;
  }

  async provisionTenant(dto: ProvisionTenantDto) {
    const { pin, tenantName, dbName, adminName, adminEmail, adminPassword } = dto;

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
      where: { database_name: sanitizedDbName },
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
      execSync(`npx prisma migrate deploy --schema="${prismaSchemaPath}"`, {
        env: {
          ...process.env,
          DATABASE_URL_TENANT: tenantDbUrl,
        },
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (err) {
      // Tentar limpar banco criado se migrate falhar
      await this.heartPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS \`${sanitizedDbName}\``);
      throw new BadRequestException('Erro ao rodar migrations no novo banco. Banco removido.');
    }

    // 8. Criar tenant + admin no banco heart (dentro de uma transaction)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const tenant = await this.heartPrisma.tenant.create({
      data: {
        name: tenantName,
        database_name: sanitizedDbName,
        database_url: tenantDbUrl,
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

    // 9. Popular produtos base no novo banco do tenant
    try {
      await this.seedTenantProducts(tenantDbUrl);
    } catch (err) {
      // Seed falhou mas não desfaz — o sistema funciona sem produtos, admins podem cadastrar manualmente
      console.warn('Aviso: seed de produtos falhou:', err.message);
    }

    return {
      message: `Tenant "${tenantName}" provisionado com sucesso!`,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        database_name: tenant.database_name,
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
          { name: 'Conveniência' },
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
          // CERVEJAS
          { name: 'Heineken Long Neck 330ml', priceSell: 6.90, priceCost: 4.80, stock: 120, categoryId: cat('Cervejas').id },
          { name: 'Heineken Latão 473ml', priceSell: 7.50, priceCost: 5.50, stock: 100, categoryId: cat('Cervejas').id },
          { name: 'Brahma Duplo Malte Latão 473ml', priceSell: 4.90, priceCost: 3.20, stock: 300, categoryId: cat('Cervejas').id },
          { name: 'Brahma Chopp Lata 350ml', priceSell: 3.50, priceCost: 2.20, stock: 150, categoryId: cat('Cervejas').id },
          { name: 'Amstel Latão 473ml', priceSell: 4.80, priceCost: 3.50, stock: 120, categoryId: cat('Cervejas').id },
          { name: 'Spaten Long Neck 355ml', priceSell: 5.90, priceCost: 4.00, stock: 90, categoryId: cat('Cervejas').id },
          { name: 'Stella Artois Long Neck 330ml', priceSell: 7.50, priceCost: 5.50, stock: 40, categoryId: cat('Cervejas').id },
          { name: 'Corona Long Neck 330ml', priceSell: 6.90, priceCost: 4.90, stock: 60, categoryId: cat('Cervejas').id },
          { name: 'Skol Lata 350ml', priceSell: 3.20, priceCost: 2.00, stock: 250, categoryId: cat('Cervejas').id },
          // DESTILADOS
          { name: 'Absolut Vodka 1L', priceSell: 95.00, priceCost: 65.00, stock: 15, categoryId: cat('Destilados').id },
          { name: 'Smirnoff Vodka 998ml', priceSell: 49.90, priceCost: 35.00, stock: 30, categoryId: cat('Destilados').id },
          { name: 'Johnnie Walker Red Label 1L', priceSell: 109.90, priceCost: 80.00, stock: 20, categoryId: cat('Destilados').id },
          { name: 'Jack Daniels No. 7 1L', priceSell: 159.90, priceCost: 110.00, stock: 10, categoryId: cat('Destilados').id },
          { name: 'Gin Tanqueray 750ml', priceSell: 139.90, priceCost: 95.00, stock: 12, categoryId: cat('Destilados').id },
          { name: 'Cachaça 51 965ml', priceSell: 14.00, priceCost: 8.50, stock: 40, categoryId: cat('Destilados').id },
          { name: 'Tequila Jose Cuervo 750ml', priceSell: 129.90, priceCost: 90.00, stock: 15, categoryId: cat('Destilados').id },
          // ENERGÉTICOS
          { name: 'Red Bull Lata 250ml', priceSell: 9.90, priceCost: 6.90, stock: 80, categoryId: cat('Energéticos').id },
          { name: 'Monster Energy 473ml', priceSell: 11.90, priceCost: 8.50, stock: 50, categoryId: cat('Energéticos').id },
          { name: 'Baly Tradicional 2L', priceSell: 15.00, priceCost: 10.00, stock: 40, categoryId: cat('Energéticos').id },
          // REFRIS
          { name: 'Coca-Cola 2L', priceSell: 11.00, priceCost: 7.50, stock: 60, categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Guaraná Antarctica 2L', priceSell: 8.50, priceCost: 5.50, stock: 70, categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Coca-Cola Lata 350ml', priceSell: 5.00, priceCost: 3.20, stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
          { name: 'Água Mineral s/ Gás 500ml', priceSell: 2.00, priceCost: 0.80, stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
          // SALGADINHOS
          { name: 'Ruffles Original 76g', priceSell: 8.50, priceCost: 5.50, stock: 30, categoryId: cat('Salgadinhos e Petiscos').id },
          { name: 'Doritos Queijo Nacho 76g', priceSell: 8.50, priceCost: 5.50, stock: 35, categoryId: cat('Salgadinhos e Petiscos').id },
          // CONVENIÊNCIA
          { name: 'Gelo Escama 5kg', priceSell: 12.00, priceCost: 6.00, stock: 30, categoryId: cat('Conveniência').id },
          { name: 'Copo Descartável 400ml (50 un)', priceSell: 10.00, priceCost: 6.00, stock: 25, categoryId: cat('Conveniência').id },
          // COMBOS
          { name: 'Combo: Vodka Smirnoff + Baly 2L + Gelo', priceSell: 68.00, priceCost: 48.00, stock: 50, categoryId: cat('Copão / Combos').id },
          { name: 'Copão: Vodka e Energético 500ml', priceSell: 15.00, priceCost: 7.00, stock: 200, categoryId: cat('Copão / Combos').id },
          // TABACARIA
          { name: 'Cigarro Marlboro Vermelho', priceSell: 12.50, priceCost: 10.00, stock: 50, categoryId: cat('Tabacaria').id },
          { name: 'Isqueiro Bic', priceSell: 6.00, priceCost: 3.50, stock: 80, categoryId: cat('Tabacaria').id },
        ],
        skipDuplicates: true,
      });

      console.log(`✅ Produtos base populados no banco: ${databaseUrl}`);
    } finally {
      await client.$disconnect();
    }
  }
}
