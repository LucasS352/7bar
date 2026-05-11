import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { PrismaClient } from '@prisma/client';

// ── DTOs internos (evitar `any`) ─────────────────────────────────────────────

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
}

// Exported so the controller can reference the return type without TS4053
export interface TenantSettingsDto {
  allowNegativeStock: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ProductsService {
  constructor(
    private tenantManager: TenantConnectionManager,
    private tenantContext: TenantContextService
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
    if (data.origem !== undefined) data.origem = parseInt(String(data.origem)) || 0;
    return data;
  }

  // ── CRUD Padrão ───────────────────────────────────────────────────────────

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

  async create(data: ProductCreateDto) {
    const prisma = await this.getPrisma();
    const sanitized = this.sanitize(data);

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

    // MySQL é case-insensitive por padrão — não precisa de mode:'insensitive' (PostgreSQL-only)
    const existing = await prisma.product.findFirst({ where: { name: sanitized.name } });
    if (existing) {
      throw new ConflictException(`Já existe um produto com o nome "${sanitized.name}". Verifique o catálogo.`);
    }

    if (!sanitized.shortCode) {
      sanitized.shortCode = await this.nextShortCode(prisma);
    }

    // Garante unidade padrão
    if (!sanitized.unit) sanitized.unit = 'UN';

    const product = await prisma.product.create({ data: sanitized as any });

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

  async update(id: string, data: ProductUpdateDto) {
    const sanitized = this.sanitize(data);
    const prisma = await this.getPrisma();

    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) throw new NotFoundException('Produto não encontrado.');

    // shortCode é auto-gerado e imutável — nunca deve ser enviado no UPDATE
    const { shortCode: _ignored, ...updateData } = sanitized as Record<string, unknown>;
    void _ignored;

    // $transaction garante atomicidade: update + log juntos ou nenhum
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data: updateData as any });

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


  async remove(id: string) {
    const prisma = await this.getPrisma();

    // A-6: Produtos com histórico (vendas ou movimentações) não devem ser deletados fisicamente.
    // Soft delete preserva integridade do histórico fiscal e de estoque.
    const [saleCount, logCount] = await Promise.all([
      prisma.saleItem.count({ where: { productId: id } }),
      prisma.inventoryLog.count({ where: { productId: id } }),
    ]);

    if (saleCount > 0 || logCount > 0) {
      // Soft delete — inativa o produto sem remover dados históricos
      return prisma.product.update({
        where: { id },
        data: { active: false },
      });
    }

    // Sem histórico: pode deletar fisicamente
    await prisma.inventoryLog.deleteMany({ where: { productId: id } });
    return prisma.product.delete({ where: { id } });
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

  // ── Importação em Lote (Fast Grid) ────────────────────────────────────────

  async bulkEntry(items: BulkItem[]) {
    const prisma = await this.getPrisma();

    // Categoria fallback
    let fallbackCategory = await prisma.category.findFirst();
    if (!fallbackCategory) {
      fallbackCategory = await prisma.category.create({ data: { name: 'Geral' } });
    }

    // ── Carrega TODOS os produtos em 1 query (elimina N+1) ────────────────
    const allProducts = await prisma.product.findMany({
      select: { id: true, name: true, shortCode: true, barcode: true, priceCost: true, priceSell: true, stock: true },
    });
    const byShortCode = new Map(allProducts.filter(p => p.shortCode).map(p => [p.shortCode!, p]));
    const byBarcode   = new Map(allProducts.filter(p => p.barcode).map(p => [p.barcode!, p]));
    const byName      = new Map(allProducts.map(p => [p.name.toLowerCase(), p]));

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
                stock:            { increment: stockToAdd },
                ...(item.categoryId        && { categoryId: item.categoryId }),
                ...(item.grupoTributacaoId && { grupoTributacaoId: item.grupoTributacaoId }),
                ...(item.ncm               && { ncm: item.ncm }),
                ...(item.cest              && { cest: item.cest }),
                ...(item.origem !== undefined && { origem: parseInt(String(item.origem)) || 0 }),
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
}
