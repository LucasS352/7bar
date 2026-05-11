"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const tenant_prisma_service_1 = require("../prisma/tenant-prisma.service");
const tenant_context_service_1 = require("../prisma/tenant-context.service");
let ProductsService = class ProductsService {
    constructor(tenantManager, tenantContext) {
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
    }
    async getPrisma() {
        const { tenantId, databaseUrl } = this.tenantContext.get();
        return this.tenantManager.getTenantClient(tenantId, databaseUrl);
    }
    async nextShortCode(prisma) {
        const result = await prisma.$queryRaw `
      SELECT MAX(CAST(shortCode AS UNSIGNED)) AS maxCode
      FROM products
      WHERE shortCode REGEXP '^[0-9]+$'
    `;
        const max = parseInt(result[0]?.maxCode ?? '0') || 0;
        return (max + 1).toString();
    }
    sanitize(data) {
        if ('shortCode' in data && data.shortCode === '')
            data.shortCode = null;
        if ('barcode' in data && data.barcode === '')
            data.barcode = null;
        if ('grupoTributacaoId' in data && data.grupoTributacaoId === '')
            data.grupoTributacaoId = null;
        if ('ncm' in data && data.ncm === '')
            data.ncm = null;
        if ('cest' in data && data.cest === '')
            data.cest = null;
        if (data.origem !== undefined)
            data.origem = parseInt(String(data.origem)) || 0;
        return data;
    }
    async findAll(page = 1, limit = 50) {
        const prisma = await this.getPrisma();
        const skip = (page - 1) * limit;
        const [total, data] = await Promise.all([
            prisma.product.count({ where: { active: true } }),
            prisma.product.findMany({
                where: { active: true },
                include: { category: true, grupoTributacao: true },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async create(data) {
        const prisma = await this.getPrisma();
        const sanitized = this.sanitize(data);
        if (!sanitized.name?.trim()) {
            throw new common_1.BadRequestException('Nome da Mercadoria é obrigatório.');
        }
        if (!sanitized.categoryId) {
            throw new common_1.BadRequestException('Categoria é obrigatória.');
        }
        if (sanitized.priceSell === undefined || sanitized.priceSell < 0) {
            throw new common_1.BadRequestException('Preço de Venda inválido.');
        }
        if (sanitized.priceCost !== undefined && sanitized.priceCost < 0) {
            throw new common_1.BadRequestException('Preço de Custo não pode ser negativo.');
        }
        if (sanitized.stock !== undefined && sanitized.stock < 0) {
            throw new common_1.BadRequestException('Estoque inicial não pode ser negativo.');
        }
        const existing = await prisma.product.findFirst({ where: { name: sanitized.name } });
        if (existing) {
            throw new common_1.ConflictException(`Já existe um produto com o nome "${sanitized.name}". Verifique o catálogo.`);
        }
        if (!sanitized.shortCode) {
            sanitized.shortCode = await this.nextShortCode(prisma);
        }
        if (!sanitized.unit)
            sanitized.unit = 'UN';
        const product = await prisma.product.create({ data: sanitized });
        if (sanitized.stock && Number(sanitized.stock) > 0) {
            await prisma.inventoryLog.create({
                data: {
                    productId: product.id,
                    type: 'IN',
                    quantity: Number(sanitized.stock),
                    costPrice: sanitized.priceCost ?? 0,
                    reason: 'Estoque Inicial — Cadastro Manual',
                },
            });
        }
        return product;
    }
    async update(id, data) {
        const sanitized = this.sanitize(data);
        const prisma = await this.getPrisma();
        const oldProduct = await prisma.product.findUnique({ where: { id } });
        if (!oldProduct)
            throw new common_1.NotFoundException('Produto não encontrado.');
        const { shortCode: _ignored, ...updateData } = sanitized;
        void _ignored;
        return prisma.$transaction(async (tx) => {
            const product = await tx.product.update({ where: { id }, data: updateData });
            if (sanitized.stock !== undefined && Number(sanitized.stock) !== Number(oldProduct.stock)) {
                const diff = Number(sanitized.stock) - Number(oldProduct.stock);
                await tx.inventoryLog.create({
                    data: {
                        productId: product.id,
                        type: diff > 0 ? 'IN' : 'OUT',
                        quantity: Math.abs(diff),
                        reason: diff > 0 ? 'Ajuste Manual Positivo' : 'Ajuste Manual (Quebra/Perda)',
                    },
                });
            }
            return product;
        });
    }
    async remove(id) {
        const prisma = await this.getPrisma();
        const [saleCount, logCount] = await Promise.all([
            prisma.saleItem.count({ where: { productId: id } }),
            prisma.inventoryLog.count({ where: { productId: id } }),
        ]);
        if (saleCount > 0 || logCount > 0) {
            return prisma.product.update({
                where: { id },
                data: { active: false },
            });
        }
        await prisma.inventoryLog.deleteMany({ where: { productId: id } });
        return prisma.product.delete({ where: { id } });
    }
    async addStock(productId, quantity, reason) {
        if (quantity <= 0) {
            throw new common_1.BadRequestException('A quantidade de entrada deve ser maior que zero.');
        }
        const prisma = await this.getPrisma();
        return prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product)
                throw new common_1.NotFoundException('Produto não encontrado.');
            const updated = await tx.product.update({
                where: { id: productId },
                data: { stock: { increment: quantity } },
            });
            await tx.inventoryLog.create({
                data: {
                    productId,
                    type: 'IN',
                    quantity,
                    reason: reason || 'Entrada de Estoque — Reposição',
                },
            });
            return { product: updated, quantityAdded: quantity };
        });
    }
    async bulkEntry(items) {
        const prisma = await this.getPrisma();
        let fallbackCategory = await prisma.category.findFirst();
        if (!fallbackCategory) {
            fallbackCategory = await prisma.category.create({ data: { name: 'Geral' } });
        }
        const allProducts = await prisma.product.findMany({
            select: { id: true, name: true, shortCode: true, barcode: true, priceCost: true, priceSell: true, stock: true },
        });
        const byShortCode = new Map(allProducts.filter(p => p.shortCode).map(p => [p.shortCode, p]));
        const byBarcode = new Map(allProducts.filter(p => p.barcode).map(p => [p.barcode, p]));
        const byName = new Map(allProducts.map(p => [p.name.toLowerCase(), p]));
        const duplicateNames = [];
        let importedCount = 0;
        const BATCH = 50;
        for (let b = 0; b < items.length; b += BATCH) {
            const batch = items.slice(b, b + BATCH);
            await prisma.$transaction(async (tx) => {
                for (const item of batch) {
                    if (!item.name?.trim())
                        continue;
                    const existing = (item.shortCode ? byShortCode.get(item.shortCode) : undefined) ??
                        (item.barcode ? byBarcode.get(item.barcode) : undefined) ??
                        null;
                    const stockToAdd = parseInt(String(item.stockToAdd ?? 0)) || 0;
                    if (existing) {
                        await tx.product.update({
                            where: { id: existing.id },
                            data: {
                                priceCost: item.priceCost ?? existing.priceCost,
                                priceSell: item.priceSell ?? existing.priceSell,
                                stock: { increment: stockToAdd },
                                ...(item.categoryId && { categoryId: item.categoryId }),
                                ...(item.grupoTributacaoId && { grupoTributacaoId: item.grupoTributacaoId }),
                                ...(item.ncm && { ncm: item.ncm }),
                                ...(item.cest && { cest: item.cest }),
                                ...(item.origem !== undefined && { origem: parseInt(String(item.origem)) || 0 }),
                            },
                        });
                        if (stockToAdd > 0) {
                            await tx.inventoryLog.create({
                                data: { productId: existing.id, type: 'IN', quantity: stockToAdd, costPrice: item.priceCost, reason: 'Entrada Lote/Fornecedor' },
                            });
                        }
                        importedCount++;
                    }
                    else {
                        if (byName.has(item.name.trim().toLowerCase())) {
                            duplicateNames.push(item.name);
                            continue;
                        }
                        const finalShortCode = item.shortCode || await this.nextShortCode(tx);
                        const created = await tx.product.create({
                            data: {
                                name: item.name.trim(),
                                shortCode: finalShortCode,
                                barcode: item.barcode || null,
                                priceCost: item.priceCost || 0,
                                priceSell: item.priceSell || 0,
                                stock: stockToAdd,
                                unit: 'UN',
                                categoryId: item.categoryId || fallbackCategory.id,
                                grupoTributacaoId: item.grupoTributacaoId || null,
                                ncm: item.ncm || null,
                                cest: item.cest || null,
                                origem: item.origem !== undefined ? parseInt(String(item.origem)) || 0 : 0,
                            },
                        });
                        byName.set(item.name.trim().toLowerCase(), created);
                        if (created.shortCode)
                            byShortCode.set(created.shortCode, created);
                        if (stockToAdd > 0) {
                            await tx.inventoryLog.create({
                                data: { productId: created.id, type: 'IN', quantity: stockToAdd, costPrice: item.priceCost, reason: 'Cadastro e Entrada Lote Inicial' },
                            });
                        }
                        importedCount++;
                    }
                }
            });
        }
        return {
            success: true,
            processed: importedCount,
            duplicates: duplicateNames,
            hasDuplicates: duplicateNames.length > 0,
        };
    }
    async getSettings() {
        const prisma = await this.getPrisma();
        const settings = await prisma.tenantSettings.upsert({
            where: { id: 'singleton' },
            update: {},
            create: { id: 'singleton', allowNegativeStock: false },
        });
        return { allowNegativeStock: settings.allowNegativeStock };
    }
    async saveSettings(data) {
        const prisma = await this.getPrisma();
        const settings = await prisma.tenantSettings.upsert({
            where: { id: 'singleton' },
            update: { allowNegativeStock: data.allowNegativeStock },
            create: { id: 'singleton', allowNegativeStock: data.allowNegativeStock },
        });
        return { allowNegativeStock: settings.allowNegativeStock };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService])
], ProductsService);
//# sourceMappingURL=products.service.js.map