import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { KdsService } from './kds.service';
import { initialKds } from './kds.rules';
import { Prisma } from '@prisma/client';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { ProductsService } from '../products/products.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class ComandasService {
  private readonly logger = new Logger(ComandasService.name);

  constructor(
    private readonly tenantManager: TenantConnectionManager,
    private readonly tenantContext: TenantContextService,
    private readonly productsService: ProductsService,
    private readonly integrationsService: IntegrationsService,
    private readonly kds: KdsService,
  ) {}

  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async findAll(status: string = 'open') {
    const prisma = await this.getPrisma();
    const whereClause: any = {};

    if (status === 'open') {
      // Default: busca todas as comandas ativas no salão (open e waiting_payment)
      whereClause.status = { in: ['open', 'waiting_payment'] };
    } else if (status !== 'all') {
      whereClause.status = status;
    }

    const comandas = await (prisma as any).comanda.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                priceSell: true,
                unit: true,
                barcode: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
        responsibleWaiter: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return comandas;
  }

  async findOne(id: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            modifiers: true,
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        sale: true,
        responsibleWaiter: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    return comanda;
  }

  async create(data: {
    number: string;
    customerName?: string;
    notes?: string;
    responsibleWaiterId?: string;
    waiterId?: string;
  }) {
    const prisma = await this.getPrisma();

    if (!data.number || data.number.trim() === '') {
      throw new BadRequestException('O número ou identificador da comanda é obrigatório.');
    }

    // Verificar se já existe uma comanda ativa (open ou waiting_payment) com o mesmo número
    const existingActive = await (prisma as any).comanda.findFirst({
      where: {
        number: data.number.trim(),
        status: { in: ['open', 'waiting_payment'] },
      },
    });

    if (existingActive) {
      throw new BadRequestException(`Já existe uma comanda/mesa aberta com a identificação "${data.number}".`);
    }

    const responsibleWaiterId = data.responsibleWaiterId || data.waiterId || null;

    const createData: any = {
      number: data.number.trim(),
      customerName: data.customerName?.trim() || null,
      notes: data.notes?.trim() || null,
      status: 'open',
      total: 0,
      responsibleWaiterId,
    };

    const comanda = await (prisma as any).comanda.create({
      data: createData,
      include: {
        items: { include: { product: true } },
        responsibleWaiter: { select: { id: true, name: true, jobTitle: true } },
      },
    });

    return comanda;
  }

  async addItems(
    comandaId: string,
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
      notes?: string;
      createdById?: string;
      modifiers?: Array<{ optionId: string }>;
      serveImmediately?: boolean;
    }>,
  ) {
    const { tenantId } = this.tenantContext.get();
    const prisma = await this.getPrisma();

    // ── Validação da comanda ─────────────────────────────────────────────────
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    if (comanda.status === 'waiting_payment') {
      throw new BadRequestException('Comanda aguardando fechamento no caixa. Reabra a comanda para realizar novos lançamentos.');
    }
    if (comanda.status !== 'open') {
      throw new BadRequestException('Não é possível adicionar itens a uma comanda já fechada ou cancelada.');
    }
    if (!items || items.length === 0) {
      throw new BadRequestException('Nenhum item fornecido para lançamento.');
    }

    // ── Ler configurações do tenant ──────────────────────────────────────────
    const tenantSettings = await (prisma as any).tenantSettings.findFirst();
    const allowNegativeStock: boolean = tenantSettings?.allowNegativeStock ?? false;
    const kdsEnabled = await this.kds.enabled();

    // ── IDs dos produtos cujo estoque foi alterado (para sync pós-commit) ────
    const affectedProductIds = new Set<string>();

    // ── Transação principal ──────────────────────────────────────────────────
    await (prisma as any).$transaction(async (tx: any) => {
      for (const item of items) {
        const qty = Number(item.quantity || 1);
        if (qty <= 0) throw new BadRequestException('Quantidade inválida.');

        // Buscar produto com grupos de modificadores (necessário para compostos)
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            modifierGroups: {
              include: {
                options: {
                  include: {
                    componentProduct: true,
                  },
                },
              },
            },
          },
        });

        if (!product) throw new NotFoundException(`Produto ID ${item.productId} não encontrado.`);
        const kdsData = initialKds(product, kdsEnabled, item.serveImmediately);

        // ════════════════════════════════════════════════════════════════════
        //  PRODUTO SIMPLES
        // ════════════════════════════════════════════════════════════════════
        if (!product.isComposite) {
          const unitPrice = item.unitPrice !== undefined
            ? new Prisma.Decimal(item.unitPrice)
            : new Prisma.Decimal(product.priceSell);
          const totalPrice = unitPrice.mul(new Prisma.Decimal(qty)).toDecimalPlaces(2);

          // Decremento atômico: evita race condition entre comandas simultâneas
          if (!allowNegativeStock) {
            const result = await tx.product.updateMany({
              where: {
                id: item.productId,
                stock: { gte: new Prisma.Decimal(qty) },
              },
              data: { stock: { decrement: new Prisma.Decimal(qty) } },
            });
            if (result.count === 0) {
              const p = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
              throw new BadRequestException(
                `Estoque insuficiente para "${product.name}". ` +
                `Disponível: ${Number(p?.stock ?? 0).toFixed(3)}, necessário: ${qty}.`,
              );
            }
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: new Prisma.Decimal(qty) } },
            });
          }

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: new Prisma.Decimal(qty),
              origin: 'COMANDA',
              reason: `Lançamento na Comanda #${comanda.number}`,
              referenceId: comanda.id,
            },
          });

          await tx.comandaItem.create({
            data: {
              comandaId,
              productId: item.productId,
              quantity: new Prisma.Decimal(qty),
              unitPrice,
              totalPrice,
              notes: item.notes || null,
              createdById: item.createdById || null,
              stockDeducted: true,
              ...kdsData,
            },
          });

          affectedProductIds.add(item.productId);

        // ════════════════════════════════════════════════════════════════════
        //  PRODUTO COMPOSTO
        // ════════════════════════════════════════════════════════════════════
        } else {
          // Validar que o produto composto tem grupos configurados
          if (!product.modifierGroups || product.modifierGroups.length === 0) {
            throw new BadRequestException(
              `Produto composto "${product.name}" não possui grupos de adicionais configurados e não pode ser lançado em comanda.`,
            );
          }

          // Validar que modifiers foram enviados
          if (!item.modifiers || item.modifiers.length === 0) {
            throw new BadRequestException(
              `Produto composto "${product.name}" requer seleção de adicionais (modifiers).`,
            );
          }

          // Validar que não há optionIds duplicados
          const sentOptionIds = item.modifiers.map(m => m.optionId);
          const uniqueSent = new Set(sentOptionIds);
          if (uniqueSent.size !== sentOptionIds.length) {
            throw new BadRequestException(
              `Seleções duplicadas de opções para o produto "${product.name}". Cada grupo deve ter exatamente uma opção.`,
            );
          }

          // Validar que a quantidade enviada é exatamente igual ao número de grupos
          if (sentOptionIds.length !== product.modifierGroups.length) {
            throw new BadRequestException(
              `Número de seleções inválido para "${product.name}". ` +
              `Esperado: ${product.modifierGroups.length} (um por grupo), recebido: ${sentOptionIds.length}.`,
            );
          }

          // Mapear todos os optionIds válidos do produto para validação
          const allValidOptionIds = new Set<string>(
            product.modifierGroups.flatMap((g: any) => g.options.map((o: any) => o.id)),
          );

          // Verificar que todas as opções enviadas pertencem ao produto
          for (const optionId of sentOptionIds) {
            if (!allValidOptionIds.has(optionId)) {
              throw new BadRequestException(
                `Opção "${optionId}" não pertence ao produto "${product.name}".`,
              );
            }
          }

          const modifiersToCreate: any[] = [];
          let priceAdjustmentTotal = new Prisma.Decimal(0);

          // Processar cada grupo do produto (garante exatamente 1 opção por grupo)
          for (const group of product.modifierGroups) {
            // Validar minSelected/maxSelected = 1 (multi-seleção não suportado nesta fase)
            if (group.minSelected !== 1 || group.maxSelected !== 1) {
              throw new BadRequestException(
                `Grupo "${group.name}" do produto "${product.name}" requer seleção múltipla ` +
                `(minSelected=${group.minSelected}, maxSelected=${group.maxSelected}) ` +
                `e ainda não é suportado em comandas. Utilize o PDV para este produto.`,
              );
            }

            // Encontrar a optionId enviada para este grupo
            const groupOptionIds = group.options.map((o: any) => o.id);
            const matchingOptionId = sentOptionIds.find(id => groupOptionIds.includes(id));

            if (!matchingOptionId) {
              throw new BadRequestException(
                `Nenhuma opção selecionada para o grupo "${group.name}" do produto "${product.name}".`,
              );
            }

            const option = group.options.find((o: any) => o.id === matchingOptionId);
            if (!option) {
              throw new BadRequestException(`Opção inválida para o produto "${product.name}".`);
            }

            const componentProduct = option.componentProduct;
            const volumeCapacity = Number(componentProduct.volumeCapacity) || 1;
            // consumedQuantity já calculado e persistido — nunca recalculado no futuro
            const consumedQuantity = qty * (Number(option.quantity) / volumeCapacity);

            // Decremento atômico do ingrediente
            if (!allowNegativeStock) {
              const result = await tx.product.updateMany({
                where: {
                  id: componentProduct.id,
                  stock: { gte: new Prisma.Decimal(consumedQuantity) },
                },
                data: { stock: { decrement: new Prisma.Decimal(consumedQuantity) } },
              });
              if (result.count === 0) {
                const p = await tx.product.findUnique({ where: { id: componentProduct.id }, select: { stock: true } });
                throw new BadRequestException(
                  `Estoque insuficiente para o ingrediente "${componentProduct.name}" ` +
                  `(${product.name}). Disponível: ${Number(p?.stock ?? 0).toFixed(3)}, necessário: ${consumedQuantity.toFixed(3)}.`,
                );
              }
            } else {
              await tx.product.update({
                where: { id: componentProduct.id },
                data: { stock: { decrement: new Prisma.Decimal(consumedQuantity) } },
              });
            }

            await tx.inventoryLog.create({
              data: {
                productId: componentProduct.id,
                type: 'OUT',
                quantity: new Prisma.Decimal(consumedQuantity),
                origin: 'COMANDA',
                reason: `Lançamento na Comanda #${comanda.number} (Composto: ${product.name})`,
                referenceId: comanda.id,
              },
            });

            priceAdjustmentTotal = priceAdjustmentTotal.add(new Prisma.Decimal(option.priceAdjustment));
            affectedProductIds.add(componentProduct.id);

            modifiersToCreate.push({
              optionId: option.id,
              componentProductId: componentProduct.id,
              name: option.name,
              consumedQuantity: new Prisma.Decimal(consumedQuantity),
              priceAdjustment: new Prisma.Decimal(option.priceAdjustment),
            });
          }

          // Preço calculado no backend — nunca vindo do frontend
          const unitPrice = new Prisma.Decimal(product.priceSell).add(priceAdjustmentTotal);
          const totalPrice = unitPrice.mul(new Prisma.Decimal(qty)).toDecimalPlaces(2);

          await tx.comandaItem.create({
            data: {
              comandaId,
              productId: item.productId,
              quantity: new Prisma.Decimal(qty),
              unitPrice,
              totalPrice,
              notes: item.notes || null,
              createdById: item.createdById || null,
              stockDeducted: true,
              ...kdsData,
              modifiers: {
                create: modifiersToCreate,
              },
            },
          });
        }
      }

      // Recalcular total da comanda dentro da transação
      const allItems = await tx.comandaItem.findMany({ where: { comandaId } });
      const newTotal = allItems.reduce((acc: number, i: any) => acc + Number(i.totalPrice), 0);
      await tx.comanda.update({
        where: { id: comandaId },
        data: { total: new Prisma.Decimal(Number(newTotal.toFixed(2))) },
      });
    });

    // ── Pós-commit: invalidar cache e sincronizar integrações ────────────────
    try {
      this.productsService.invalidateCache(tenantId);
    } catch (err) {
      this.logger.error(`Erro ao invalidar cache: ${err.message}`);
    }
    if (affectedProductIds.size > 0) {
      setTimeout(() => {
        this.integrationsService
          .syncProductStock(tenantId, [...affectedProductIds])
          .catch(err => this.logger.error(`Erro ao sincronizar estoque: ${err.message}`));
      }, 500);
    }

    return this.findOne(comandaId);
  }

  async removeItem(comandaId: string, itemId: string) {
    const { tenantId } = this.tenantContext.get();
    const prisma = await this.getPrisma();

    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    if (comanda.status === 'waiting_payment') {
      throw new BadRequestException('Comanda aguardando fechamento no caixa. Reabra a comanda para remover itens.');
    }
    if (comanda.status !== 'open') {
      throw new BadRequestException('Comanda inválida ou já encerrada.');
    }

    // Buscar item com segurança dupla: id + comandaId (evita remover item de outra comanda)
    const item = await (prisma as any).comandaItem.findFirst({
      where: { id: itemId, comandaId: comandaId },
      include: {
        modifiers: true,
        product: { select: { id: true, name: true, isComposite: true } },
      },
    });

    if (!item) throw new NotFoundException('Item não encontrado nesta comanda.');

    const affectedProductIds = new Set<string>();

    await (prisma as any).$transaction(async (tx: any) => {
      // Estorno de estoque apenas se stockDeducted = true
      if (item.stockDeducted) {
        if (item.modifiers && item.modifiers.length > 0) {
          // Produto composto: estornar via snapshot (consumedQuantity já calculado)
          for (const mod of item.modifiers) {
            await tx.product.update({
              where: { id: mod.componentProductId },
              data: { stock: { increment: new Prisma.Decimal(mod.consumedQuantity) } },
            });
            await tx.inventoryLog.create({
              data: {
                productId: mod.componentProductId,
                type: 'IN',
                quantity: new Prisma.Decimal(mod.consumedQuantity),
                origin: 'COMANDA',
                reason: `Remoção de item da Comanda #${comanda.number} (Composto: ${item.product.name})`,
                referenceId: comandaId,
              },
            });
            affectedProductIds.add(mod.componentProductId);
          }
        } else {
          // Produto simples
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: new Prisma.Decimal(item.quantity) } },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: new Prisma.Decimal(item.quantity),
              origin: 'COMANDA',
              reason: `Remoção de item da Comanda #${comanda.number}`,
              referenceId: comandaId,
            },
          });
          affectedProductIds.add(item.productId);
        }
      }

      // Deletar item (modifiers são deletados em cascade via onDelete: Cascade)
      await tx.comandaItem.delete({ where: { id: itemId } });

      // Recalcular total
      const remaining = await tx.comandaItem.findMany({ where: { comandaId } });
      const newTotal = remaining.reduce((acc: number, i: any) => acc + Number(i.totalPrice), 0);
      await tx.comanda.update({
        where: { id: comandaId },
        data: { total: new Prisma.Decimal(Number(newTotal.toFixed(2))) },
      });
    });

    // Pós-commit
    try {
      this.productsService.invalidateCache(tenantId);
    } catch (err) {
      this.logger.error(`Erro ao invalidar cache: ${err.message}`);
    }
    if (affectedProductIds.size > 0) {
      setTimeout(() => {
        this.integrationsService
          .syncProductStock(tenantId, [...affectedProductIds])
          .catch(err => this.logger.error(`Erro ao sincronizar estoque: ${err.message}`));
      }, 500);
    }

    return this.findOne(comandaId);
  }

  async requestPayment(comandaId: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
      include: { items: true },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    // Idempotência: se já estiver em waiting_payment, retorna com sucesso HTTP 200
    if (comanda.status === 'waiting_payment') {
      return this.findOne(comandaId);
    }

    if (comanda.status !== 'open') {
      throw new BadRequestException('Apenas comandas abertas podem solicitar fechamento.');
    }

    if (!comanda.items || comanda.items.length === 0) {
      throw new BadRequestException('Não é possível solicitar fechamento de uma comanda sem itens lançados.');
    }

    await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: { status: 'waiting_payment' },
    });

    return this.findOne(comandaId);
  }

  async reopen(comandaId: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    if (comanda.status !== 'waiting_payment') {
      throw new BadRequestException('Apenas comandas aguardando pagamento podem ser reabertas.');
    }

    await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: { status: 'open' },
    });

    return this.findOne(comandaId);
  }

  async closeComanda(comandaId: string, saleId?: string) {
    const prisma = await this.getPrisma();
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    // Idempotência se já estiver fechada
    if (comanda.status === 'closed') {
      return comanda;
    }

    // Permite fechar tanto comanda open quanto waiting_payment (retrocompatibilidade)
    const updated = await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: {
        status: 'closed',
        saleId: saleId || null,
      },
    });

    return updated;
  }

  async cancelComanda(comandaId: string) {
    const { tenantId } = this.tenantContext.get();
    const prisma = await this.getPrisma();

    // Buscar comanda com todos os itens e modifiers para estorno correto
    const comanda = await (prisma as any).comanda.findUnique({
      where: { id: comandaId },
      include: {
        items: {
          include: {
            modifiers: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!comanda) throw new NotFoundException('Comanda não encontrada.');

    if (!['open', 'waiting_payment'].includes(comanda.status)) {
      throw new BadRequestException(
        `Não é possível cancelar uma comanda com status "${comanda.status}". ` +
        `Apenas comandas abertas ou aguardando pagamento podem ser canceladas.`,
      );
    }

    const affectedProductIds = new Set<string>();

    await (prisma as any).$transaction(async (tx: any) => {
      // Estornar estoque de todos os itens com stockDeducted = true
      for (const item of comanda.items) {
        if (!item.stockDeducted) continue;

        if (item.modifiers && item.modifiers.length > 0) {
          // Produto composto: estornar via snapshot
          for (const mod of item.modifiers) {
            await tx.product.update({
              where: { id: mod.componentProductId },
              data: { stock: { increment: new Prisma.Decimal(mod.consumedQuantity) } },
            });
            await tx.inventoryLog.create({
              data: {
                productId: mod.componentProductId,
                type: 'IN',
                quantity: new Prisma.Decimal(mod.consumedQuantity),
                origin: 'COMANDA',
                reason: `Cancelamento da Comanda #${comanda.number} (Composto: ${item.product.name})`,
                referenceId: comandaId,
              },
            });
            affectedProductIds.add(mod.componentProductId);
          }
        } else {
          // Produto simples
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: new Prisma.Decimal(item.quantity) } },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: new Prisma.Decimal(item.quantity),
              origin: 'COMANDA',
              reason: `Cancelamento da Comanda #${comanda.number}`,
              referenceId: comandaId,
            },
          });
          affectedProductIds.add(item.productId);
        }
      }

      await tx.comanda.update({
        where: { id: comandaId },
        data: { status: 'cancelled' },
      });
    });

    // Pós-commit
    try {
      this.productsService.invalidateCache(tenantId);
    } catch (err) {
      this.logger.error(`Erro ao invalidar cache: ${err.message}`);
    }
    if (affectedProductIds.size > 0) {
      setTimeout(() => {
        this.integrationsService
          .syncProductStock(tenantId, [...affectedProductIds])
          .catch(err => this.logger.error(`Erro ao sincronizar estoque: ${err.message}`));
      }, 500);
    }

    return this.findOne(comandaId);
  }

  private async recalculateTotal(comandaId: string) {
    const prisma = await this.getPrisma();
    const items = await (prisma as any).comandaItem.findMany({
      where: { comandaId },
    });

    const newTotal = items.reduce((acc: number, item: any) => acc + Number(item.totalPrice), 0);

    await (prisma as any).comanda.update({
      where: { id: comandaId },
      data: {
        total: Number(newTotal.toFixed(2)),
      },
    });
  }
}
