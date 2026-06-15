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
var TenantsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
const tenant_context_service_1 = require("../prisma/tenant-context.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let TenantsService = TenantsService_1 = class TenantsService {
    constructor(heartPrisma, tenantManager, tenantContext) {
        this.heartPrisma = heartPrisma;
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
        this.logger = new common_1.Logger(TenantsService_1.name);
    }
    findAll() {
        return this.heartPrisma.tenant.findMany({ include: { users: true, tenantIntegrations: true } });
    }
    create(data) {
        return this.heartPrisma.tenant.create({ data });
    }
    async findById(tenantId) {
        const tenant = await this.heartPrisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa não encontrada');
        const { certPfx, ...safeTenant } = tenant;
        try {
            const tenantPrisma = await this.tenantManager.getTenantClient(tenantId, tenant.databaseUrl);
            const numeracao = await tenantPrisma.numeracaoNfce.findUnique({
                where: { serie: tenant.nfceSerie || 1 }
            });
            safeTenant.proximaNota = (numeracao?.ultimo ?? 0) + 1;
        }
        catch (e) {
            this.logger.warn(`Não foi possível carregar a numeração da NFC-e para o tenant ${tenantId}: ${e.message}`);
            safeTenant.proximaNota = 1;
        }
        return safeTenant;
    }
    async updateTenant(tenantId, data) {
        const allowed = [
            'razaoSocial', 'nomeFantasia', 'cnpj', 'ie', 'im', 'crt',
            'logradouro', 'numero', 'complemento', 'bairro',
            'municipio', 'codMunicipio', 'uf', 'cep', 'telefone',
            'nfceAtivo', 'nfceSerie', 'nfceAmbiente', 'nfceCsc', 'nfceIdCsc',
            'modulos', 'status', 'emailContador', 'mensalidadeValor', 'mensalidadeVencimento'
        ];
        const safeData = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
        if (safeData.crt != null)
            safeData.crt = Number(safeData.crt);
        if (safeData.nfceSerie != null)
            safeData.nfceSerie = Number(safeData.nfceSerie);
        if (safeData.nfceAmbiente != null)
            safeData.nfceAmbiente = Number(safeData.nfceAmbiente);
        if (safeData.mensalidadeValor != null) {
            safeData.mensalidadeValor = Number(safeData.mensalidadeValor);
        }
        if (safeData.mensalidadeVencimento !== undefined) {
            safeData.mensalidadeVencimento = safeData.mensalidadeVencimento ? new Date(safeData.mensalidadeVencimento) : null;
        }
        if (safeData.cnpj) {
            const cleanCnpj = String(safeData.cnpj).replace(/\D/g, '');
            const duplicate = await this.heartPrisma.tenant.findFirst({
                where: { cnpj: cleanCnpj, id: { not: tenantId } }
            });
            if (duplicate) {
                this.logger.warn(`[Ambiente de Testes] CNPJ ${data.cnpj} já pertence à empresa "${duplicate.razaoSocial || duplicate.name}". ` +
                    'CNPJ não atualizado. Demais campos serão salvos normalmente.');
                delete safeData.cnpj;
            }
            else {
                safeData.cnpj = cleanCnpj;
            }
        }
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
                }
                catch (dbErr) {
                    this.logger.error(`Erro ao atualizar proximaNota para tenant ${tenantId}: ${dbErr.message}`);
                }
            }
        }
        try {
            return await this.heartPrisma.tenant.update({
                where: { id: tenantId },
                data: safeData,
            });
        }
        catch (err) {
            this.logger.error(`Erro ao atualizar tenant ${tenantId}: ${err.message}`, err.stack);
            throw new common_1.BadRequestException(`Erro ao salvar dados no banco: ${err.message}`);
        }
    }
    async uploadLogo(tenantId, file) {
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
    async uploadCertificado(tenantId, pfxBuffer, senha) {
        return this.heartPrisma.tenant.update({
            where: { id: tenantId },
            data: {
                certPfx: Buffer.from(pfxBuffer),
                certSenha: senha,
                certValidade: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            },
        }).then(() => ({ message: 'Certificado armazenado com sucesso.' }));
    }
    async validatePin(pin) {
        const setupPin = process.env.SETUP_PIN;
        if (!setupPin)
            throw new common_1.BadRequestException('SETUP_PIN não configurado no servidor.');
        return pin === setupPin;
    }
    async migrateTenants(tenantIds) {
        const results = [];
        const tenants = await this.heartPrisma.tenant.findMany({
            where: { id: { in: tenantIds } }
        });
        for (const tenant of tenants) {
            this.logger.log(`[Migracao] Iniciando atualizacao de schema do tenant: ${tenant.name} (${tenant.databaseName})`);
            const TenantPrismaClient = require('@prisma/client').PrismaClient;
            const tenantPrisma = new TenantPrismaClient({
                datasources: { db: { url: tenant.databaseUrl } }
            });
            try {
                await tenantPrisma.$executeRawUnsafe(`UPDATE sales SET operatorId = NULL`).catch(() => { });
                await tenantPrisma.$executeRawUnsafe(`UPDATE cash_registers SET operatorId = NULL`).catch(() => { });
            }
            catch (e) {
                this.logger.warn(`Aviso na limpeza pre-migracao de ${tenant.name}: ${e.message}`);
            }
            finally {
                await tenantPrisma.$disconnect();
            }
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
            }
            catch (err) {
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
    async getTenantCategories(tenantId) {
        const tenant = await this.heartPrisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || !tenant.databaseUrl)
            return [];
        try {
            const tenantPrisma = await this.tenantManager.getTenantClient(tenantId, tenant.databaseUrl);
            return await tenantPrisma.category.findMany({ orderBy: { name: 'asc' } });
        }
        catch (e) {
            this.logger.error(`Erro ao buscar categorias do tenant ${tenantId}: ${e.message}`);
            return [];
        }
    }
    async provisionTenant(dto) {
        const { pin, tenantName, dbName, adminName, adminEmail, adminPassword, seedProducts, mensalidadeValor, mensalidadeVencimento } = dto;
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
            where: { databaseName: sanitizedDbName },
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
            await execAsync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate --accept-data-loss`, {
                env: {
                    ...process.env,
                    DATABASE_URL_TENANT: tenantDbUrl,
                },
                timeout: 60000,
            });
        }
        catch (err) {
            await this.heartPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS \`${sanitizedDbName}\``);
            this.logger.error(`Erro no provisionamento (db push) do tenant ${tenantName}: ${err.stdout} ${err.stderr}`);
            throw new common_1.BadRequestException('Erro ao criar tabelas no novo banco. Detalhe: ' + (err.stderr || err.message));
        }
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
        if (seedProducts !== false) {
            try {
                await this.seedTenantProducts(tenantDbUrl);
            }
            catch (err) {
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
    async seedTenantProducts(databaseUrl) {
        const client = new client_1.PrismaClient({
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
            const uniqueCategories = [...new Set(masterProducts.map(p => p.category).filter(Boolean))];
            await client.category.createMany({
                data: uniqueCategories.map(name => ({ name: name })),
                skipDuplicates: true,
            });
            const tenantCategories = await client.category.findMany();
            const getCatId = (name) => {
                if (!name)
                    return undefined;
                return tenantCategories.find(c => c.name === name)?.id;
            };
            const productsData = masterProducts.map((p, index) => {
                const catId = getCatId(p.category);
                if (!catId)
                    return null;
                return {
                    name: p.name + (p.brand ? ` - ${p.brand}` : ''),
                    shortCode: (index + 1).toString(),
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
            const batchSize = 500;
            for (let i = 0; i < productsData.length; i += batchSize) {
                const batch = productsData.slice(i, i + batchSize);
                await client.product.createMany({
                    data: batch,
                    skipDuplicates: true,
                });
            }
            this.logger.log(`✅ Produtos base populados com SUCESSO no banco: ${databaseUrl}`);
        }
        catch (err) {
            this.logger.error(`❌ Erro ao popular produtos base: ${err.message}`, err.stack);
            throw err;
        }
        finally {
            await client.$disconnect();
        }
    }
    async setDiscountPin(tenantId, pin) {
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
    async verifyDiscountPin(tenantId, pin) {
        const { databaseUrl } = this.tenantContext.get();
        const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
        const settings = await prisma.tenantSettings.findUnique({ where: { id: 'singleton' } });
        if (!settings?.discountPin)
            return false;
        return bcrypt.compare(pin, settings.discountPin);
    }
    async deleteTenant(tenantId) {
        const tenant = await this.heartPrisma.tenant.findUnique({
            where: { id: tenantId }
        });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa não encontrada');
        try {
            this.logger.log(`⚠️ Excluindo banco de dados: ${tenant.databaseName}`);
            await this.heartPrisma.$executeRawUnsafe(`DROP DATABASE \`${tenant.databaseName}\``);
            this.logger.log(`✅ Banco de dados ${tenant.databaseName} excluído com sucesso.`);
        }
        catch (e) {
            this.logger.error(`Falha ao excluir o banco de dados ${tenant.databaseName}: ${e.message}`);
        }
        await this.heartPrisma.tenant.delete({
            where: { id: tenantId }
        });
        return { success: true };
    }
    async registrarPagamento(tenantId) {
        const tenant = await this.heartPrisma.tenant.findUnique({
            where: { id: tenantId }
        });
        if (!tenant)
            throw new common_1.NotFoundException('Empresa não encontrada');
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
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = TenantsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [heart_prisma_service_1.HeartPrismaService,
        tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map