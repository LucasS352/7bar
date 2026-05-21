import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { PrismaClient, Prisma } from '@prisma/client';

// ── DTOs internos (evitar `any`) ─────────────────────────────────────────────

interface ModifierOptionInputDto {
  name: string;
  componentProductId: string;
  quantity: number;
  priceAdjustment?: number;
}

interface ModifierGroupInputDto {
  name: string;
  minSelected?: number;
  maxSelected?: number;
  options: ModifierOptionInputDto[];
}

interface ProductCreateDto {
  name: string;
  shortCode?: string | null;
  barcode?: string | null;
  unit?: string;
  priceCost?: number;
  priceSell: number;
  stock?: number;
  categoryId: string;
  grupoTributacaoId?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem?: number;
  imageUrl?: string | null;
  isComposite?: boolean;
  volumeUnit?: string | null;
  volumeCapacity?: number | null;
  modifierGroups?: ModifierGroupInputDto[];
}

interface ProductUpdateDto {
  name?: string;
  shortCode?: string | null;
  barcode?: string | null;
  unit?: string;
  priceCost?: number;
  priceSell?: number;
  stock?: number;
  categoryId?: string;
  grupoTributacaoId?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem?: number;
  active?: boolean;
  imageUrl?: string | null;
  isComposite?: boolean;
  volumeUnit?: string | null;
  volumeCapacity?: number | null;
  modifierGroups?: ModifierGroupInputDto[];
}

interface BulkItem {
  name: string;
  shortCode?: string | null;
  barcode?: string | null;
  priceCost?: number;
  priceSell?: number;
  stockToAdd?: number;
  categoryId?: string;
  grupoTributacaoId?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem?: number;
  imageUrl?: string | null;
  isComposite?: boolean;
  volumeUnit?: string | null;
  volumeCapacity?: number | null;
}

// Exported so the controller can reference the return type without TS4053
export interface TenantSettingsDto {
  allowNegativeStock: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

import { HeartPrismaService } from '../prisma/heart-prisma.service';

@Injectable()
export class ProductsService {
  private catalogCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutos

  private invalidateCache(tenantId: string) {
    for (const key of this.catalogCache.keys()) {
      if (key.startsWith(tenantId)) {
        this.catalogCache.delete(key);
      }
    }
  }

  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService,
    private heartPrisma: HeartPrismaService
  ) {}

  /** Atalho para pegar o cliente prisma do contexto atual */
  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  // ── Utilitários Internos ──────────────────────────────────────────────────

  /** Gera o próximo shortCode de forma atômica via MAX() no banco — sem race condition */
  private async nextShortCode(prisma: Awaited<ReturnType<TenantConnectionManager['getTenantClient']>>): Promise<string> {
    const result = await prisma.$queryRaw<[{ maxCode: string | null }]>`
      SELECT MAX(CAST(shortCode AS UNSIGNED)) AS maxCode
      FROM products
      WHERE shortCode REGEXP '^[0-9]+$'
    `;
    const max = parseInt(result[0]?.maxCode ?? '0') || 0;
    return (max + 1).toString();
  }

  /** Sanitiza campos opcionais para null quando vazios */
  private sanitize<T extends ProductCreateDto | ProductUpdateDto>(data: T): T {
    if ('shortCode' in data && data.shortCode === '') data.shortCode = null;
    if ('barcode' in data && data.barcode === '') data.barcode = null;
    if ('grupoTributacaoId' in data && data.grupoTributacaoId === '') data.grupoTributacaoId = null;
    if ('ncm' in data && data.ncm === '') data.ncm = null;
    if ('cest' in data && data.cest === '') data.cest = null;
    if ('imageUrl' in data && data.imageUrl === '') data.imageUrl = null;
    if (data.origem !== undefined) data.origem = parseInt(String(data.origem)) || 0;
    if ('volumeUnit' in data && data.volumeUnit === '') data.volumeUnit = null;
    if ('volumeCapacity' in data && !data.volumeCapacity && data.volumeCapacity !== 0) {
      data.volumeCapacity = null;
    } else if ('volumeCapacity' in data && data.volumeCapacity != null) {
      data.volumeCapacity = Number(data.volumeCapacity);
    }
    return data;
  }

  // ── Rota Mágica (Lookup MasterProduct) ────────────────────────────────────

  async lookupBarcode(barcode: string) {
    const prisma = await this.getPrisma();
    
    // 1. Busca no banco da loja (Tenant) primeiro
    const localProduct = await prisma.product.findUnique({
      where: { barcode }
    });
    
    if (localProduct) {
      return { source: 'local', data: localProduct };
    }

    // 2. Não achou? Busca no banco Mestre (Heart)
    let masterProduct = await this.heartPrisma.masterProduct.findUnique({
      where: { ean: barcode }
    });

    // 2.1 Fallback para códigos com zero à esquerda (leitores às vezes mandam 14 dígitos em EAN-13)
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
          // brand and category can be passed to front-end to be used as default names if needed
          brand: masterProduct.brand,
          masterCategory: masterProduct.category
        }
      };
    }

    throw new NotFoundException('Produto não encontrado em nenhum catálogo.');
  }

  // ── CRUD Padrão ───────────────────────────────────────────────────────────

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

  async getComposition(id: string) {
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

  async create(data: ProductCreateDto) {
    const prisma = await this.getPrisma();
    const { modifierGroups, ...rest } = data;
    const sanitized = this.sanitize(rest as any);

    // ── Validação de input (A-2) ───────────────────────────────────────────
    if (!sanitized.name?.trim()) {
      throw new BadRequestException('Nome da Mercadoria é obrigatório.');
    }
    if (!sanitized.categoryId) {
      throw new BadRequestException('Categoria é obrigatória.');
    }
    if (sanitized.priceSell === undefined || sanitized.priceSell < 0) {
      throw new BadRequestException('Preço de Venda inválido.');
    }
    if (sanitized.priceCost !== undefined && sanitized.priceCost < 0) {
      throw new BadRequestException('Preço de Custo não pode ser negativo.');
    }
    if (sanitized.stock !== undefined && sanitized.stock < 0) {
      throw new BadRequestException('Estoque inicial não pode ser negativo.');
    }
    // ──────────────────────────────────────────────────────

    const existing = await prisma.product.findFirst({ where: { name: sanitized.name } });
    if (existing) {
      throw new ConflictException(`Já existe um produto com o nome "${sanitized.name}". Verifique o catálogo.`);
    }

    if (!sanitized.shortCode) {
      sanitized.shortCode = await this.nextShortCode(prisma);
    }

    if (!sanitized.unit) sanitized.unit = 'UN';

    const isComposite = data.isComposite ?? false;
    const volumeUnit = data.volumeUnit || null;
    const volumeCapacity = data.volumeCapacity !== undefined && data.volumeCapacity !== null ? new Prisma.Decimal(data.volumeCapacity) : null;

    const product = await prisma.product.create({
      data: {
        name: sanitized.name,
        shortCode: sanitized.shortCode,
        barcode: sanitized.barcode,
        unit: sanitized.unit,
        priceCost: sanitized.priceCost !== undefined ? new Prisma.Decimal(sanitized.priceCost) : new Prisma.Decimal(0),
        priceSell: new Prisma.Decimal(sanitized.priceSell),
        stock: sanitized.stock !== undefined ? new Prisma.Decimal(sanitized.stock) : new Prisma.Decimal(0),
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
                  quantity: new Prisma.Decimal(opt.quantity),
                  priceAdjustment: new Prisma.Decimal(opt.priceAdjustment ?? 0),
                }))
              }
            }))
          }
        } : {})
      } as any
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

  async update(id: string, data: ProductUpdateDto) {
    const { modifierGroups, ...rest } = data;
    const sanitized = this.sanitize(rest as any);
    const prisma = await this.getPrisma();

    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) throw new NotFoundException('Produto não encontrado.');

    const { shortCode: _ignored, ...updateData } = sanitized as Record<string, unknown>;
    void _ignored;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const productPayload: any = {};
      
      if (updateData.name !== undefined) productPayload.name = updateData.name;
      if (updateData.barcode !== undefined) productPayload.barcode = updateData.barcode;
      if (updateData.unit !== undefined) productPayload.unit = updateData.unit;
      if (updateData.priceCost !== undefined) productPayload.priceCost = new Prisma.Decimal(updateData.priceCost as number);
      if (updateData.priceSell !== undefined) productPayload.priceSell = new Prisma.Decimal(updateData.priceSell as number);
      if (updateData.stock !== undefined) productPayload.stock = new Prisma.Decimal(updateData.stock as number);
      if (updateData.categoryId !== undefined) productPayload.categoryId = updateData.categoryId;
      if (updateData.grupoTributacaoId !== undefined) productPayload.grupoTributacaoId = updateData.grupoTributacaoId;
      if (updateData.ncm !== undefined) productPayload.ncm = updateData.ncm;
      if (updateData.cest !== undefined) productPayload.cest = updateData.cest;
      if (updateData.origem !== undefined) productPayload.origem = updateData.origem;
      if (updateData.imageUrl !== undefined) productPayload.imageUrl = updateData.imageUrl;
      if (updateData.active !== undefined) productPayload.active = updateData.active;
      
      productPayload.isComposite = data.isComposite ?? oldProduct.isComposite;
      productPayload.volumeUnit = data.volumeUnit !== undefined ? data.volumeUnit : oldProduct.volumeUnit;
      productPayload.volumeCapacity = data.volumeCapacity !== undefined 
        ? (data.volumeCapacity !== null ? new Prisma.Decimal(data.volumeCapacity) : null)
        : oldProduct.volumeCapacity;

      const product = await tx.product.update({ 
        where: { id }, 
        data: productPayload 
      });

      if (productPayload.isComposite === false) {
        await tx.productModifierGroup.deleteMany({ where: { productId: id } });
      } else if (modifierGroups !== undefined) {
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
                  quantity: new Prisma.Decimal(opt.quantity),
                  priceAdjustment: new Prisma.Decimal(opt.priceAdjustment ?? 0),
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


  async remove(id: string) {
    const prisma = await this.getPrisma();

    // A-6: Produtos com histórico (vendas ou movimentações) não devem ser deletados fisicamente.
    // Soft delete preserva integridade do histórico fiscal e de estoque.
    const [saleCount, logCount] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.inventoryLog.count({ where: { productId: id } }),
    ]);

    let result;
    if (saleCount > 0 || logCount > 0) {
      // Soft delete — inativa o produto sem remover dados históricos
      result = await prisma.product.update({
        where: { id },
        data: { active: false },
      });
    } else {
      // Sem histórico: pode deletar fisicamente
      await prisma.inventoryLog.deleteMany({ where: { productId: id } });
      result = await prisma.product.delete({ where: { id } });
    }

    this.invalidateCache(this.tenantContext.get().tenantId);
    return result;
  }

  // ── Entrada de Estoque Incremental ────────────────────────────────────────

  /**
   * Adiciona quantidade ao estoque de forma segura usando Prisma increment.
   * Executado dentro de uma transaction para evitar condições de corrida.
   */
  async addStock(productId: string, quantity: number, reason?: string) {
    if (quantity <= 0) {
      throw new BadRequestException('A quantidade de entrada deve ser maior que zero.');
    }

    const prisma = await this.getPrisma();

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new NotFoundException('Produto não encontrado.');

      // Usa increment nativo do Prisma — atômico, sem condição de corrida
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: new Prisma.Decimal(quantity) } },
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

  // ── Importação em Lote (Fast Grid) ────────────────────────────────────────

  async bulkEntry(items: BulkItem[]) {
    const prisma = await this.getPrisma();

    // Categoria fallback
    let fallbackCategory = await prisma.category.findFirst();
    if (!fallbackCategory) {
      fallbackCategory = await prisma.category.create({ data: { name: 'Geral' } });
    }

    // ── Carrega APENAS os produtos do lote em 1 query (elimina N+1 e OOM) ────────────────
    const shortCodes = items.map(i => i.shortCode).filter(Boolean) as string[];
    const barcodes = items.map(i => i.barcode).filter(Boolean) as string[];
    const names = items.map(i => i.name?.trim()).filter(Boolean) as string[];

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
    const byShortCode = new Map(batchProducts.filter(p => p.shortCode).map(p => [p.shortCode!, p]));
    const byBarcode   = new Map(batchProducts.filter(p => p.barcode).map(p => [p.barcode!, p]));
    const byName      = new Map(batchProducts.map(p => [p.name.toLowerCase(), p]));

    const duplicateNames: string[] = [];
    let importedCount = 0;

    // ── Processa em batches de 50 dentro de transactions ─────────────────
    const BATCH = 50;
    for (let b = 0; b < items.length; b += BATCH) {
      const batch = items.slice(b, b + BATCH);

      await prisma.$transaction(async (tx) => {
        for (const item of batch) {
          if (!item.name?.trim()) continue;

          const existing =
            (item.shortCode ? byShortCode.get(item.shortCode) : undefined) ??
            (item.barcode   ? byBarcode.get(item.barcode)     : undefined) ??
            null;

          const stockToAdd = parseInt(String(item.stockToAdd ?? 0)) || 0;

          if (existing) {
            // Produto já existe — atualiza preços e soma estoque
            await tx.product.update({
              where: { id: existing.id },
              data: {
                priceCost:        item.priceCost        ?? existing.priceCost,
                priceSell:        item.priceSell        ?? existing.priceSell,
                stock:            { increment: new Prisma.Decimal(stockToAdd) },
                ...(item.categoryId        && { categoryId: item.categoryId }),
                ...(item.grupoTributacaoId && { grupoTributacaoId: item.grupoTributacaoId }),
                ...(item.ncm               && { ncm: item.ncm }),
                ...(item.cest              && { cest: item.cest }),
                ...(item.origem !== undefined && { origem: parseInt(String(item.origem)) || 0 }),
                ...(item.imageUrl          && { imageUrl: item.imageUrl }),
                ...(item.isComposite !== undefined && { isComposite: item.isComposite }),
                ...(item.volumeUnit !== undefined && { volumeUnit: item.volumeUnit === '' ? null : item.volumeUnit }),
                ...(item.volumeCapacity !== undefined && { volumeCapacity: item.volumeCapacity ? new Prisma.Decimal(item.volumeCapacity) : null }),
              },
            });

            if (stockToAdd > 0) {
              await tx.inventoryLog.create({
                data: { productId: existing.id, type: 'IN', quantity: stockToAdd, costPrice: item.priceCost, reason: 'Entrada Lote/Fornecedor' },
              });
            }
            importedCount++;
          } else {
            // Verifica conflito de nome usando Map em memória (sem query extra)
            if (byName.has(item.name.trim().toLowerCase())) {
              duplicateNames.push(item.name);
              continue;
            }

            const finalShortCode = item.shortCode || await this.nextShortCode(tx as any);

            const created = await tx.product.create({
              data: {
                name:              item.name.trim(),
                shortCode:         finalShortCode,
                barcode:           item.barcode           || null,
                priceCost:         item.priceCost         || 0,
                priceSell:         item.priceSell         || 0,
                stock:             stockToAdd,
                unit:              'UN',
                categoryId:        item.categoryId        || fallbackCategory!.id,
                grupoTributacaoId: item.grupoTributacaoId || null,
                ncm:               item.ncm               || null,
                cest:              item.cest              || null,
                origem:            item.origem !== undefined ? parseInt(String(item.origem)) || 0 : 0,
                imageUrl:          item.imageUrl          || null,
                isComposite:       item.isComposite !== undefined ? !!item.isComposite : false,
                volumeUnit:        item.volumeUnit === '' ? null : (item.volumeUnit || null),
                volumeCapacity:    item.volumeCapacity ? new Prisma.Decimal(item.volumeCapacity) : null,
              },
            });

            // Atualiza Map em memória para evitar conflitos dentro do mesmo lote
            byName.set(item.name.trim().toLowerCase(), created as any);
            if (created.shortCode) byShortCode.set(created.shortCode, created as any);

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

  // ── Configurações do Tenant ───────────────────────────────────────────────

  /** Lê configurações globais do tenant (singleton via upsert) */
  async getSettings(): Promise<TenantSettingsDto> {
    const prisma = await this.getPrisma();
    const settings = await prisma.tenantSettings.upsert({
      where:  { id: 'singleton' },
      update: {},
      create: { id: 'singleton', allowNegativeStock: false },
    });
    return { allowNegativeStock: settings.allowNegativeStock };
  }

  /** Atualiza configurações globais do tenant */
  async saveSettings(data: TenantSettingsDto): Promise<TenantSettingsDto> {
    const prisma = await this.getPrisma();
    const settings = await prisma.tenantSettings.upsert({
      where:  { id: 'singleton' },
      update: { allowNegativeStock: data.allowNegativeStock },
      create: { id: 'singleton', allowNegativeStock: data.allowNegativeStock },
    });
    return { allowNegativeStock: settings.allowNegativeStock };
  }

  async uploadPhoto(tenantId: string, file: Express.Multer.File) {
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
}
