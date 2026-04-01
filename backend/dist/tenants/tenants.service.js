"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
let TenantsService = class TenantsService {
    heartPrisma;
    constructor(heartPrisma) {
        this.heartPrisma = heartPrisma;
    }
    findAll() {
        return this.heartPrisma.tenant.findMany({ include: { users: true } });
    }
    create(data) {
        return this.heartPrisma.tenant.create({ data });
    }
    async validatePin(pin) {
        const setupPin = process.env.SETUP_PIN;
        if (!setupPin)
            throw new common_1.BadRequestException('SETUP_PIN não configurado no servidor.');
        return pin === setupPin;
    }
    async provisionTenant(dto) {
        const { pin, tenantName, dbName, adminName, adminEmail, adminPassword } = dto;
        const pinValid = await this.validatePin(pin);
        if (!pinValid) {
            throw new common_1.UnauthorizedException('PIN inválido. Acesso negado.');
        }
        const sanitizedDbName = dbName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '');
        if (!sanitizedDbName) {
            throw new common_1.BadRequestException('Nome do banco inválido após sanitização.');
        }
        const existingTenant = await this.heartPrisma.tenant.findFirst({
            where: { database_name: sanitizedDbName },
        });
        if (existingTenant) {
            throw new common_1.BadRequestException(`Já existe um tenant com o banco "${sanitizedDbName}".`);
        }
        const existingUser = await this.heartPrisma.user.findUnique({
            where: { email: adminEmail },
        });
        if (existingUser) {
            throw new common_1.BadRequestException(`Já existe um usuário com o email "${adminEmail}".`);
        }
        await this.heartPrisma.$queryRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        const baseUrl = process.env.DATABASE_URL_HEART || '';
        const tenantDbUrl = baseUrl.replace(/\/[^/]+$/, `/${sanitizedDbName}`);
        try {
            const prismaSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
            (0, child_process_1.execSync)(`npx prisma migrate deploy --schema="${prismaSchemaPath}"`, {
                env: {
                    ...process.env,
                    DATABASE_URL_TENANT: tenantDbUrl,
                },
                stdio: 'pipe',
                timeout: 60000,
            });
        }
        catch (err) {
            await this.heartPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS \`${sanitizedDbName}\``);
            throw new common_1.BadRequestException('Erro ao rodar migrations no novo banco. Banco removido.');
        }
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
        try {
            await this.seedTenantProducts(tenantDbUrl);
        }
        catch (err) {
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
    async seedTenantProducts(databaseUrl) {
        const client = new client_1.PrismaClient({
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
            const cat = (name) => allCategories.find((c) => c.name === name);
            await client.product.createMany({
                data: [
                    { name: 'Heineken Long Neck 330ml', priceSell: 6.90, priceCost: 4.80, stock: 120, categoryId: cat('Cervejas').id },
                    { name: 'Heineken Latão 473ml', priceSell: 7.50, priceCost: 5.50, stock: 100, categoryId: cat('Cervejas').id },
                    { name: 'Brahma Duplo Malte Latão 473ml', priceSell: 4.90, priceCost: 3.20, stock: 300, categoryId: cat('Cervejas').id },
                    { name: 'Brahma Chopp Lata 350ml', priceSell: 3.50, priceCost: 2.20, stock: 150, categoryId: cat('Cervejas').id },
                    { name: 'Amstel Latão 473ml', priceSell: 4.80, priceCost: 3.50, stock: 120, categoryId: cat('Cervejas').id },
                    { name: 'Spaten Long Neck 355ml', priceSell: 5.90, priceCost: 4.00, stock: 90, categoryId: cat('Cervejas').id },
                    { name: 'Stella Artois Long Neck 330ml', priceSell: 7.50, priceCost: 5.50, stock: 40, categoryId: cat('Cervejas').id },
                    { name: 'Corona Long Neck 330ml', priceSell: 6.90, priceCost: 4.90, stock: 60, categoryId: cat('Cervejas').id },
                    { name: 'Skol Lata 350ml', priceSell: 3.20, priceCost: 2.00, stock: 250, categoryId: cat('Cervejas').id },
                    { name: 'Absolut Vodka 1L', priceSell: 95.00, priceCost: 65.00, stock: 15, categoryId: cat('Destilados').id },
                    { name: 'Smirnoff Vodka 998ml', priceSell: 49.90, priceCost: 35.00, stock: 30, categoryId: cat('Destilados').id },
                    { name: 'Johnnie Walker Red Label 1L', priceSell: 109.90, priceCost: 80.00, stock: 20, categoryId: cat('Destilados').id },
                    { name: 'Jack Daniels No. 7 1L', priceSell: 159.90, priceCost: 110.00, stock: 10, categoryId: cat('Destilados').id },
                    { name: 'Gin Tanqueray 750ml', priceSell: 139.90, priceCost: 95.00, stock: 12, categoryId: cat('Destilados').id },
                    { name: 'Cachaça 51 965ml', priceSell: 14.00, priceCost: 8.50, stock: 40, categoryId: cat('Destilados').id },
                    { name: 'Tequila Jose Cuervo 750ml', priceSell: 129.90, priceCost: 90.00, stock: 15, categoryId: cat('Destilados').id },
                    { name: 'Red Bull Lata 250ml', priceSell: 9.90, priceCost: 6.90, stock: 80, categoryId: cat('Energéticos').id },
                    { name: 'Monster Energy 473ml', priceSell: 11.90, priceCost: 8.50, stock: 50, categoryId: cat('Energéticos').id },
                    { name: 'Baly Tradicional 2L', priceSell: 15.00, priceCost: 10.00, stock: 40, categoryId: cat('Energéticos').id },
                    { name: 'Coca-Cola 2L', priceSell: 11.00, priceCost: 7.50, stock: 60, categoryId: cat('Refrigerantes e Sucos').id },
                    { name: 'Guaraná Antarctica 2L', priceSell: 8.50, priceCost: 5.50, stock: 70, categoryId: cat('Refrigerantes e Sucos').id },
                    { name: 'Coca-Cola Lata 350ml', priceSell: 5.00, priceCost: 3.20, stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
                    { name: 'Água Mineral s/ Gás 500ml', priceSell: 2.00, priceCost: 0.80, stock: 120, categoryId: cat('Refrigerantes e Sucos').id },
                    { name: 'Ruffles Original 76g', priceSell: 8.50, priceCost: 5.50, stock: 30, categoryId: cat('Salgadinhos e Petiscos').id },
                    { name: 'Doritos Queijo Nacho 76g', priceSell: 8.50, priceCost: 5.50, stock: 35, categoryId: cat('Salgadinhos e Petiscos').id },
                    { name: 'Gelo Escama 5kg', priceSell: 12.00, priceCost: 6.00, stock: 30, categoryId: cat('Conveniência').id },
                    { name: 'Copo Descartável 400ml (50 un)', priceSell: 10.00, priceCost: 6.00, stock: 25, categoryId: cat('Conveniência').id },
                    { name: 'Combo: Vodka Smirnoff + Baly 2L + Gelo', priceSell: 68.00, priceCost: 48.00, stock: 50, categoryId: cat('Copão / Combos').id },
                    { name: 'Copão: Vodka e Energético 500ml', priceSell: 15.00, priceCost: 7.00, stock: 200, categoryId: cat('Copão / Combos').id },
                    { name: 'Cigarro Marlboro Vermelho', priceSell: 12.50, priceCost: 10.00, stock: 50, categoryId: cat('Tabacaria').id },
                    { name: 'Isqueiro Bic', priceSell: 6.00, priceCost: 3.50, stock: 80, categoryId: cat('Tabacaria').id },
                ],
                skipDuplicates: true,
            });
            console.log(`✅ Produtos base populados no banco: ${databaseUrl}`);
        }
        finally {
            await client.$disconnect();
        }
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [heart_prisma_service_1.HeartPrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map