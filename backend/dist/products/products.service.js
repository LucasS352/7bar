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
const client_1 = require("@prisma/client");
const heart_prisma_service_1 = require("../prisma/heart-prisma.service");
let ProductsService = class ProductsService {
    invalidateCache(tenantId) {
        for (const key of this.catalogCache.keys()) {
            if (key.startsWith(tenantId)) {
                this.catalogCache.delete(key);
            }
        }
    }
    constructor(tenantManager, tenantContext, heartPrisma) {
        this.tenantManager = tenantManager;
        this.tenantContext = tenantContext;
        this.heartPrisma = heartPrisma;
        this.catalogCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000;
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
        if ('imageUrl' in data && data.imageUrl === '')
            data.imageUrl = null;
        if (data.origem !== undefined)
            data.origem = parseInt(String(data.origem)) || 0;
        if ('volumeUnit' in data && data.volumeUnit === '')
            data.volumeUnit = null;
        if ('volumeCapacity' in data && !data.volumeCapacity && data.volumeCapacity !== 0) {
            data.volumeCapacity = null;
        }
        else if ('volumeCapacity' in data && data.volumeCapacity != null) {
            data.volumeCapacity = Number(data.volumeCapacity);
        }
        return data;
    }
    async lookupBarcode(barcode) {
        const prisma = await this.getPrisma();
        const localProduct = await prisma.product.findUnique({
            where: { barcode }
        });
        if (localProduct) {
            return { source: 'local', data: localProduct };
        }
        let masterProduct = await this.heartPrisma.masterProduct.findUnique({
            where: { ean: barcode }
        });
        if (!masterProduct && barcode.length === 14 && barcode.startsWith('0')) {
            const stripped = barcode.substring(1);
            masterProduct = await this.heartPrisma.masterProduct.findUnique({
                where: { ean: stripped }
            });
        }
        if (masterProduct) {
            return {
                source: 'master',
                data: {
                    name: masterProduct.name,
                    barcode: masterProduct.ean,
                    ncm: masterProduct.ncm,
                    cest: masterProduct.cest,
                    unit: masterProduct.unit,
                    imageUrl: masterProduct.imageUrl,
                    brand: masterProduct.brand,
                    masterCategory: masterProduct.category
                }
            };
        }
        throw new common_1.NotFoundException('Produto não encontrado em nenhum catálogo.');
    }
    async findAll(page = 1, limit = 50) {
        const { tenantId } = this.tenantContext.get();
        const cacheKey = `${tenantId}_p_${page}_l_${limit}`;
        const cached = this.catalogCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }
        const prisma = await this.getPrisma();
        const skip = (page - 1) * limit;
        const [total, data] = await Promise.all([
            prisma.product.count({ where: { active: true } }),
            prisma.product.findMany({
                where: { active: true },
                include: {
                    category: true,
                    grupoTributacao: true,
                    modifierGroups: {
                        include: {
                            options: {
                                include: {
                                    componentProduct: true
                                }
                            }
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
        ]);
        const result = {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
        this.catalogCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    }
    async getComposition(id) {
        const prisma = await this.getPrisma();
        return prisma.productModifierGroup.findMany({
            where: { productId: id },
            include: {
                options: {
                    include: {
                        componentProduct: true,
                    },
                },
            },
        });
    }
    async create(data) {
        const prisma = await this.getPrisma();
        const { modifierGroups, ...rest } = data;
        const sanitized = this.sanitize(rest);
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
        const isComposite = data.isComposite ?? false;
        const volumeUnit = data.volumeUnit || null;
        const volumeCapacity = data.volumeCapacity !== undefined && data.volumeCapacity !== null ? new client_1.Prisma.Decimal(data.volumeCapacity) : null;
        const product = await prisma.product.create({
            data: {
                name: sanitized.name,
                shortCode: sanitized.shortCode,
                barcode: sanitized.barcode,
                unit: sanitized.unit,
                priceCost: sanitized.priceCost !== undefined ? new client_1.Prisma.Decimal(sanitized.priceCost) : new client_1.Prisma.Decimal(0),
                priceSell: new client_1.Prisma.Decimal(sanitized.priceSell),
                stock: sanitized.stock !== undefined ? new client_1.Prisma.Decimal(sanitized.stock) : new client_1.Prisma.Decimal(0),
                categoryId: sanitized.categoryId,
                grupoTributacaoId: sanitized.grupoTributacaoId,
                ncm: sanitized.ncm,
                cest: sanitized.cest,
                origem: sanitized.origem,
                imageUrl: sanitized.imageUrl,
                isComposite,
                volumeUnit,
                volumeCapacity,
                ...(isComposite && modifierGroups && modifierGroups.length > 0 ? {
                    modifierGroups: {
                        create: modifierGroups.map(group => ({
                            name: group.name,
                            minSelected: group.minSelected ?? 1,
                            maxSelected: group.maxSelected ?? 1,
                            options: {
                                create: group.options.map(opt => ({
                                    name: opt.name,
                                    componentProductId: opt.componentProductId,
                                    quantity: new client_1.Prisma.Decimal(opt.quantity),
                                    priceAdjustment: new client_1.Prisma.Decimal(opt.priceAdjustment ?? 0),
                                }))
                            }
                        }))
                    }
                } : {})
            }
        });
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
        this.invalidateCache(this.tenantContext.get().tenantId);
        return product;
    }
    async update(id, data) {
        const { modifierGroups, ...rest } = data;
        const sanitized = this.sanitize(rest);
        const prisma = await this.getPrisma();
        const oldProduct = await prisma.product.findUnique({ where: { id } });
        if (!oldProduct)
            throw new common_1.NotFoundException('Produto não encontrado.');
        const { shortCode: _ignored, ...updateData } = sanitized;
        void _ignored;
        const updatedProduct = await prisma.$transaction(async (tx) => {
            const productPayload = {};
            if (updateData.name !== undefined)
                productPayload.name = updateData.name;
            if (updateData.barcode !== undefined)
                productPayload.barcode = updateData.barcode;
            if (updateData.unit !== undefined)
                productPayload.unit = updateData.unit;
            if (updateData.priceCost !== undefined)
                productPayload.priceCost = new client_1.Prisma.Decimal(updateData.priceCost);
            if (updateData.priceSell !== undefined)
                productPayload.priceSell = new client_1.Prisma.Decimal(updateData.priceSell);
            if (updateData.stock !== undefined)
                productPayload.stock = new client_1.Prisma.Decimal(updateData.stock);
            if (updateData.categoryId !== undefined)
                productPayload.categoryId = updateData.categoryId;
            if (updateData.grupoTributacaoId !== undefined)
                productPayload.grupoTributacaoId = updateData.grupoTributacaoId;
            if (updateData.ncm !== undefined)
                productPayload.ncm = updateData.ncm;
            if (updateData.cest !== undefined)
                productPayload.cest = updateData.cest;
            if (updateData.origem !== undefined)
                productPayload.origem = updateData.origem;
            if (updateData.imageUrl !== undefined)
                productPayload.imageUrl = updateData.imageUrl;
            if (updateData.active !== undefined)
                productPayload.active = updateData.active;
            productPayload.isComposite = data.isComposite ?? oldProduct.isComposite;
            productPayload.volumeUnit = data.volumeUnit !== undefined ? data.volumeUnit : oldProduct.volumeUnit;
            productPayload.volumeCapacity = data.volumeCapacity !== undefined
                ? (data.volumeCapacity !== null ? new client_1.Prisma.Decimal(data.volumeCapacity) : null)
                : oldProduct.volumeCapacity;
            const product = await tx.product.update({
                where: { id },
                data: productPayload
            });
            if (productPayload.isComposite === false) {
                await tx.productModifierGroup.deleteMany({ where: { productId: id } });
            }
            else if (modifierGroups !== undefined) {
                await tx.productModifierGroup.deleteMany({ where: { productId: id } });
                for (const group of modifierGroups) {
                    await tx.productModifierGroup.create({
                        data: {
                            productId: id,
                            name: group.name,
                            minSelected: group.minSelected ?? 1,
                            maxSelected: group.maxSelected ?? 1,
                            options: {
                                create: group.options.map(opt => ({
                                    name: opt.name,
                                    componentProductId: opt.componentProductId,
                                    quantity: new client_1.Prisma.Decimal(opt.quantity),
                                    priceAdjustment: new client_1.Prisma.Decimal(opt.priceAdjustment ?? 0),
                                }))
                            }
                        }
                    });
                }
            }
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
        this.invalidateCache(this.tenantContext.get().tenantId);
        return updatedProduct;
    }
    async remove(id) {
        const prisma = await this.getPrisma();
        const [saleCount, logCount] = await Promise.all([
            prisma.saleItem.count({ where: { productId: id } }),
            prisma.inventoryLog.count({ where: { productId: id } }),
        ]);
        let result;
        if (saleCount > 0 || logCount > 0) {
            result = await prisma.product.update({
                where: { id },
                data: { active: false },
            });
        }
        else {
            await prisma.inventoryLog.deleteMany({ where: { productId: id } });
            result = await prisma.product.delete({ where: { id } });
        }
        this.invalidateCache(this.tenantContext.get().tenantId);
        return result;
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
                data: { stock: { increment: new client_1.Prisma.Decimal(quantity) } },
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
        const shortCodes = items.map(i => i.shortCode).filter(Boolean);
        const barcodes = items.map(i => i.barcode).filter(Boolean);
        const names = items.map(i => i.name?.trim()).filter(Boolean);
        const batchProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { shortCode: { in: shortCodes } },
                    { barcode: { in: barcodes } },
                    { name: { in: names } },
                ]
            },
            select: { id: true, name: true, shortCode: true, barcode: true, priceCost: true, priceSell: true, stock: true },
        });
        const byShortCode = new Map(batchProducts.filter(p => p.shortCode).map(p => [p.shortCode, p]));
        const byBarcode = new Map(batchProducts.filter(p => p.barcode).map(p => [p.barcode, p]));
        const byName = new Map(batchProducts.map(p => [p.name.toLowerCase(), p]));
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
                                stock: { increment: new client_1.Prisma.Decimal(stockToAdd) },
                                ...(item.categoryId && { categoryId: item.categoryId }),
                                ...(item.grupoTributacaoId && { grupoTributacaoId: item.grupoTributacaoId }),
                                ...(item.ncm && { ncm: item.ncm }),
                                ...(item.cest && { cest: item.cest }),
                                ...(item.origem !== undefined && { origem: parseInt(String(item.origem)) || 0 }),
                                ...(item.imageUrl && { imageUrl: item.imageUrl }),
                                ...(item.isComposite !== undefined && { isComposite: item.isComposite }),
                                ...(item.volumeUnit !== undefined && { volumeUnit: item.volumeUnit === '' ? null : item.volumeUnit }),
                                ...(item.volumeCapacity !== undefined && { volumeCapacity: item.volumeCapacity ? new client_1.Prisma.Decimal(item.volumeCapacity) : null }),
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
                                imageUrl: item.imageUrl || null,
                                isComposite: item.isComposite !== undefined ? !!item.isComposite : false,
                                volumeUnit: item.volumeUnit === '' ? null : (item.volumeUnit || null),
                                volumeCapacity: item.volumeCapacity ? new client_1.Prisma.Decimal(item.volumeCapacity) : null,
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
        this.invalidateCache(this.tenantContext.get().tenantId);
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
    async uploadPhoto(tenantId, file) {
        const fs = require('fs');
        const crypto = require('crypto');
        const path = require('path');
        const dir = path.join(process.cwd(), 'uploads', 'products');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const ext = path.extname(file.originalname);
        const filename = `${tenantId}_${crypto.randomBytes(8).toString('hex')}${ext}`;
        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, file.buffer);
        const imageUrl = `/api/products/uploads/images/${filename}`;
        return { imageUrl };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_prisma_service_1.TenantConnectionManager,
        tenant_context_service_1.TenantContextService,
        heart_prisma_service_1.HeartPrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map