import { Injectable, BadRequestException, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { NfceService } from '../nfce/nfce.service';
import { ProductsService } from '../products/products.service';
import { Prisma } from '@prisma/client';
import archiver = require('archiver');
import { MailService } from '../mail/mail.service';
import { IntegrationsService } from '../integrations/integrations.service';

/** Mapa de método de pagamento → tPag SEFAZ (Tabela 5.4) */
const TPAG_MAP: Record<string, string> = {
  dinheiro: '01',
  credito:  '03',
  debito:   '04',
  pix:      '17',
  outros:   '99',
};

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private tenantManager: TenantConnectionManager,
    private heartPrisma: HeartPrismaService,
    private nfceService: NfceService,
    private tenantContext: TenantContextService,
    private productsService: ProductsService,
    private mailService: MailService,
    private integrationsService: IntegrationsService
  ) {}

  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  private async consumeLotsFIFO(
    tx: any,
    productId: string,
    quantityToConsume: number,
    fallbackCostPrice: any
  ): Promise<{ lotId: string; quantity: Prisma.Decimal; costPrice: Prisma.Decimal }[]> {
    const activeLots = await tx.stockLot.findMany({
      where: { productId, remaining: { gt: 0 } },
      orderBy: { createdAt: 'asc' }
    });

    const consumptions: { lotId: string; quantity: Prisma.Decimal; costPrice: Prisma.Decimal }[] = [];
    let quantityNeeded = new Prisma.Decimal(quantityToConsume);

    for (const lot of activeLots) {
      if (quantityNeeded.lte(0)) break;
      const lotRemaining = new Prisma.Decimal(lot.remaining);
      const consumed = Prisma.Decimal.min(quantityNeeded, lotRemaining);

      await tx.stockLot.update({
        where: { id: lot.id },
        data: { remaining: { decrement: consumed } }
      });

      consumptions.push({
        lotId: lot.id,
        quantity: consumed,
        costPrice: new Prisma.Decimal(lot.costPrice)
      });

      quantityNeeded = quantityNeeded.sub(consumed);
    }

    if (quantityNeeded.gt(0)) {
      const latestLot = await tx.stockLot.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' }
      });

      if (latestLot) {
        await tx.stockLot.update({
          where: { id: latestLot.id },
          data: { remaining: { decrement: quantityNeeded } }
        });
        consumptions.push({
          lotId: latestLot.id,
          quantity: quantityNeeded,
          costPrice: new Prisma.Decimal(latestLot.costPrice)
        });
      } else {
        const fallbackLot = await tx.stockLot.create({
          data: {
            productId,
            costPrice: fallbackCostPrice !== undefined && fallbackCostPrice !== null ? new Prisma.Decimal(fallbackCostPrice) : new Prisma.Decimal(0),
            quantity: 0,
            remaining: new Prisma.Decimal(0).sub(quantityNeeded)
          }
        });
        consumptions.push({
          lotId: fallbackLot.id,
          quantity: quantityNeeded,
          costPrice: new Prisma.Decimal(fallbackLot.costPrice)
        });
      }
    }

    return consumptions;
  }

  async checkout(data: any) {
    const { userId, tenantId } = this.tenantContext.get();
    let operatorId = data.operatorId || userId;
    const prisma = await this.getPrisma();

    const sale = await prisma.$transaction(async (tx: any) => {
      let subtotal = new Prisma.Decimal(0);

      // ─── 0. Ler configurações do tenant e validar caixa ────────────────────
      const isConsumption = !!data.consumedByOperatorId;

      if (!isConsumption && !data.cashRegisterId) {
        throw new BadRequestException('Não é possível realizar venda: Caixa não informado.');
      }

      let cashRegister: any = null;
      if (data.cashRegisterId) {
        cashRegister = await tx.cashRegister.findUnique({
          where: { id: data.cashRegisterId }
        });

        if (!cashRegister || cashRegister.status !== 'open') {
          throw new BadRequestException('O caixa selecionado está fechado ou é inválido. Abra o caixa primeiro.');
        }
      }

      const tenantSettings = await tx.tenantSettings.findUnique({ where: { id: 'singleton' } });
      const allowNegativeStock = tenantSettings?.allowNegativeStock ?? false;

      // ─── 1. Validar estoque e montar snapshot fiscal de cada item ───────────
      const productIds = data.items.map((item: any) => item.productId);
      
      const modifierComponentIds = data.items
         .filter((i: any) => i.modifiers && i.modifiers.length > 0)
         .flatMap((i: any) => i.modifiers.map((m: any) => m.componentProductId));

      const allProductIds = Array.from(new Set([...productIds, ...modifierComponentIds]));

      const productsInDb = await tx.product.findMany({
        where: { id: { in: allProductIds } },
        include: { 
          grupoTributacao: true,
          category: {
            include: {
              grupoTributacao: true
            }
          },
          modifierGroups: {
            include: {
              options: true
            }
          }
        },
      });

      const productMap = new Map(productsInDb.map((p: any) => [p.id, p]));

      const inventoryLogsToCreate: any[] = [];

      for (const item of data.items) {
        const qty = Number(item.quantity);
        const priceUnit = new Prisma.Decimal(item.priceUnit);
        const itemSubtotal = priceUnit.mul(new Prisma.Decimal(qty)).toDecimalPlaces(2);
        subtotal = subtotal.add(itemSubtotal);
      }

      const discount = new Prisma.Decimal(data.discount || 0);
      let total = subtotal.sub(discount);

      // Calcular total pago para detectar acréscimo (ex: iFood com valor maior que o carrinho)
      let paymentsTotal = new Prisma.Decimal(0);
      const paymentsData = data.payments.map((pay: any) => {
        paymentsTotal = paymentsTotal.add(new Prisma.Decimal(pay.value));
        return {
          tPag:   TPAG_MAP[pay.method] ?? '99',
          method: pay.method,
          label:  pay.label ?? null, // label customizado (ex: "iFood")
          value:  Number(pay.value),
          troco:  Number(pay.troco || 0),
        };
      });

      let addition = new Prisma.Decimal(0);
      if (paymentsTotal.gt(total)) {
        addition = paymentsTotal.sub(total);
        total = paymentsTotal;
      }
      
      const finalTotalStr = total.toDecimalPlaces(2);


      // ─── 3. Numeração NFC-e (se solicitada) ─────────────────────────────────
      let nfceNumero: number | null = null;
      const emitirNfce = Boolean(data.emitirNfce);

      if (emitirNfce) {
        const serie = data.nfceSerie ?? 1;
        const numeracao = await tx.numeracaoNfce.upsert({
          where: { serie },
          update: { ultimo: { increment: 1 } },
          create: { serie, ultimo: 1 },
        });
        nfceNumero = numeracao.ultimo;
      }

      // ─── 4. Criar a venda ────────────────────────────────────────────────────
      if (operatorId) {
        const opExists = await tx.operator.findUnique({ where: { id: operatorId } });
        if (!opExists) {
          this.logger.warn(`Operador ${operatorId} não encontrado no banco — venda será criada sem operador.`);
          operatorId = null;
        }
      }

      const sale = await tx.sale.create({
        data: {
          customerId:     data.customerId || null,
          operatorId,
          cashRegisterId: data.cashRegisterId || null,
          subtotal,
          discount,
          addition, // <-- Salvando o acréscimo
          total: finalTotalStr,
          status:         'completed',
          emitirNfce,
          nfceStatus:     emitirNfce ? 'pendente' : null,
          nfceNumero,
          nfceSerie:      emitirNfce ? (data.nfceSerie ?? 1) : null,
          consumidorCpf:  data.customerCpf  || null,
          consumidorNome: data.customerName || null,
          ...(data.offlineContingency && data.offlineCreatedAt ? { createdAt: new Date(data.offlineCreatedAt) } : {}),
          payments: { create: paymentsData },
        }
      });

      for (const item of data.items) {
        const product = productMap.get(item.productId) as any;
        if (!product) {
          throw new BadRequestException(`Produto ${item.productId} não encontrado no banco de dados.`);
        }

        const qty = Number(item.quantity);
        const itemModifiersDataToCreate: any[] = [];
        const itemLotConsumptions: any[] = [];
        let totalCostOfLots = new Prisma.Decimal(0);

        if (product.isComposite) {
          await tx.product.update({
            where: { id: item.productId },
            data: { salesCount: { increment: qty } },
          });

          const chosenModifiers = item.modifiers || [];
          for (const chosenMod of chosenModifiers) {
            let foundOption: any = null;
            for (const group of product.modifierGroups || []) {
              foundOption = (group.options || []).find(
                (opt: any) => opt.id === chosenMod.optionId || opt.componentProductId === chosenMod.componentProductId
              );
              if (foundOption) break;
            }

            if (!foundOption) {
              throw new BadRequestException(`Opção de adicional inválida para o produto composto: ${product.name}`);
            }

            const componentProduct = productMap.get(foundOption.componentProductId) as any;
            if (!componentProduct) {
              throw new BadRequestException(`Produto ingrediente ${foundOption.name} não encontrado.`);
            }

            const optionQty = Number(foundOption.quantity);
            const capacity = Number(componentProduct.volumeCapacity) || 1;
            const fractionToDecrement = qty * (optionQty / capacity);

            if (!allowNegativeStock) {
              const updateResult = await tx.product.updateMany({
                where: {
                  id: componentProduct.id,
                  stock: { gte: new Prisma.Decimal(fractionToDecrement) }
                },
                data: {
                  stock: { decrement: new Prisma.Decimal(fractionToDecrement) }
                }
              });
              if (updateResult.count === 0) {
                throw new BadRequestException(`Estoque insuficiente para o ingrediente: ${componentProduct.name} (disponível: ${componentProduct.stock}, necessário: ${fractionToDecrement.toFixed(3)})`);
              }
            } else {
              await tx.product.update({
                where: { id: componentProduct.id },
                data: {
                  stock: { decrement: new Prisma.Decimal(fractionToDecrement) }
                }
              });
            }

            inventoryLogsToCreate.push({
              productId: componentProduct.id,
              type: 'OUT',
              quantity: fractionToDecrement,
              reason: `Venda PDV (Combo: ${product.name})`,
            });

            itemModifiersDataToCreate.push({
              componentProductId: componentProduct.id,
              name: foundOption.name,
              quantity: new Prisma.Decimal(optionQty),
              priceAdjustment: new Prisma.Decimal(foundOption.priceAdjustment),
            });

            const ingredientConsumptions = await this.consumeLotsFIFO(tx, componentProduct.id, fractionToDecrement, componentProduct.priceCost);
            for (const cons of ingredientConsumptions) {
              itemLotConsumptions.push({
                lotId: cons.lotId,
                quantity: cons.quantity,
                costPrice: cons.costPrice
              });
              totalCostOfLots = totalCostOfLots.add(cons.quantity.mul(cons.costPrice));
            }
          }
        } else {
          if (!allowNegativeStock) {
            const updateResult = await tx.product.updateMany({
              where: {
                id: item.productId,
                stock: { gte: new Prisma.Decimal(qty) }
              },
              data: {
                stock: { decrement: new Prisma.Decimal(qty) },
                salesCount: { increment: qty }
              }
            });
            if (updateResult.count === 0) {
              throw new BadRequestException(`Estoque insuficiente para o produto: ${product.name} (disponível: ${product.stock}, tentado: ${qty})`);
            }
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { 
                stock: { decrement: new Prisma.Decimal(qty) },
                salesCount: { increment: qty }
              },
            });
          }

          inventoryLogsToCreate.push({
            productId: product.id,
            type: 'SALE',
            quantity: qty,
            reason: 'Venda PDV',
          });

          const productConsumptions = await this.consumeLotsFIFO(tx, product.id, qty, product.priceCost);
          for (const cons of productConsumptions) {
            itemLotConsumptions.push({
              lotId: cons.lotId,
              quantity: cons.quantity,
              costPrice: cons.costPrice
            });
            totalCostOfLots = totalCostOfLots.add(cons.quantity.mul(cons.costPrice));
          }
        }

        const priceUnit = new Prisma.Decimal(item.priceUnit);
        const itemSubtotal = priceUnit.mul(new Prisma.Decimal(qty)).toDecimalPlaces(2);
        const gt = product.grupoTributacao || product.category?.grupoTributacao;
        const priceCost = qty > 0 ? totalCostOfLots.div(new Prisma.Decimal(qty)) : new Prisma.Decimal(0);

        await tx.saleItem.create({
          data: {
            saleId:      sale.id,
            productId:   product.id,
            productName: item.fiscalSnapshot?.productName ?? product.name,
            unit:        item.fiscalSnapshot?.unit ?? (product.unit || 'UN'),
            quantity:    qty,
            priceUnit,
            discount:    item.fiscalSnapshot?.discount ?? 0,
            subtotal:    item.fiscalSnapshot?.subtotal ?? itemSubtotal,
            ncm:         item.fiscalSnapshot?.ncm ?? product.ncm   ?? null,
            cest:        item.fiscalSnapshot?.cest ?? product.cest  ?? null,
            cfop:        item.fiscalSnapshot?.cfop ?? gt?.cfop      ?? '5102',
            origem:      item.fiscalSnapshot?.origem ?? product.origem ?? 0,
            csosn:       item.fiscalSnapshot?.csosn ?? gt?.csosn     ?? null,
            cstIcms:     item.fiscalSnapshot?.cstIcms ?? gt?.cstIcms   ?? null,
            aliqIcms:    item.fiscalSnapshot?.aliqIcms ?? Number(gt?.aliqIcms ?? 0),
            valorIcms:   0,
            cstPis:      item.fiscalSnapshot?.cstPis ?? gt?.cstPis    ?? '99',
            aliqPis:     item.fiscalSnapshot?.aliqPis ?? Number(gt?.aliqPis ?? 0),
            valorPis:    0,
            cstCofins:   item.fiscalSnapshot?.cstCofins ?? gt?.cstCofins ?? '99',
            aliqCofins:  item.fiscalSnapshot?.aliqCofins ?? Number(gt?.aliqCofins ?? 0),
            valorCofins: 0,
            priceCost,
            modifiers: {
              create: itemModifiersDataToCreate
            },
            lotConsumptions: {
              create: itemLotConsumptions.map(lc => ({
                lotId: lc.lotId,
                quantity: lc.quantity
              }))
            }
          }
        });
      }

      if (inventoryLogsToCreate.length > 0) {
        await tx.inventoryLog.createMany({ data: inventoryLogsToCreate });
      }

      if (data.consumedByOperatorId) {
        await tx.operatorConsumption.create({
          data: {
            operatorId: data.consumedByOperatorId,
            saleId: sale.id,
            settled: false,
          }
        });
      }

      const fullSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              modifiers: true,
              lotConsumptions: true
            }
          },
          payments: true,
          customer: true
        }
      });

      if (emitirNfce) {
        const { tenantId, databaseUrl } = this.tenantContext.get();
        setImmediate(() => this.dispararNfce(tenantId, databaseUrl, fullSale));
      }

      // ─── Disparar sincronização de estoque no iFood (se ativada) ───────────
      if (allProductIds.length > 0) {
        const { tenantId } = this.tenantContext.get();
        setImmediate(() => this.integrationsService.syncProductStock(tenantId, allProductIds));
      }

      return fullSale;
    });

    try {
      this.productsService.invalidateCache(tenantId);
    } catch (err) {
      this.logger.error(`Erro ao invalidar cache de produtos do tenant ${tenantId}: ${err.message}`);
    }

    return sale;
  }

  /**
   * Dispara a emissão NFC-e de forma assíncrona após a venda ser salva ou via CRON.
   * Atualiza o registro da venda com o resultado.
   */
  public async dispararNfce(tenantId: string, databaseUrl: string, sale: any) {
    try {
      // Buscar dados do tenant (emitente) e certificado
      const tenant = await this.heartPrisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant || !tenant.nfceAtivo) {
        this.logger.warn(`NFC-e não habilitada para tenant ${tenantId}`);
        await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, { nfceStatus: 'nao_emitida' });
        return;
      }

      const certPfxBase64 = tenant.certPfx
        ? Buffer.from(tenant.certPfx).toString('base64')
        : null;

      if (!certPfxBase64 || !tenant.certSenha) {
        this.logger.error(`Certificado A1 não configurado para tenant ${tenantId}`);
        await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, {
          nfceStatus: 'rejeitada',
          nfceMotivoRejeicao: 'Certificado digital não configurado.',
        });
        return;
      }

      const resultado = await this.nfceService.emitir({
        ambiente: tenant.nfceAmbiente ?? 2,
        certPfxBase64,
        certSenha: tenant.certSenha,
        empresa: {
          cnpj:        tenant.cnpj,
          ie:          tenant.ie,
          razaoSocial: tenant.razaoSocial,
          nomeFantasia: tenant.nomeFantasia,
          crt:         tenant.crt,
          csc:         tenant.nfceCsc,
          idCsc:       tenant.nfceIdCsc,
          serie:       tenant.nfceSerie,
          ambiente:    tenant.nfceAmbiente,
          endereco: {
            logradouro:   tenant.logradouro,
            numero:       tenant.numero,
            complemento:  tenant.complemento,
            bairro:       tenant.bairro,
            municipio:    tenant.municipio,
            codMunicipio: tenant.codMunicipio,
            uf:           tenant.uf,
            cep:          tenant.cep,
            telefone:     tenant.telefone,
          },
        },
        nota: {
          numero:     sale.nfceNumero,
          serie:      sale.nfceSerie,
          total:      sale.total,
          desconto:   sale.discount,
          consumidor: {
            cpf:  sale.consumidorCpf,
            nome: sale.consumidorNome,
          },
          itens: sale.items.map((i: any) => ({
            produtoId:  i.productId,
            xProd:      i.productName,
            ncm:        i.ncm,
            cest:       i.cest,
            cfop:       i.cfop,
            unit:       i.unit,
            quantidade: Number(i.quantity),
            valorUnit:  Number(i.priceUnit),
            subtotal:   Number(i.subtotal),
            origem:     i.origem,
            csosn:      i.csosn,
            cstIcms:    i.cstIcms,
            aliqIcms:   Number(i.aliqIcms),
            cstPis:     i.cstPis,
            aliqPis:    Number(i.aliqPis),
            cstCofins:  i.cstCofins,
            aliqCofins: Number(i.aliqCofins),
          })),
          pagamentos: sale.payments.map((p: any) => ({
            tPag: p.tPag,
            valor: Number(p.value),
            troco: Number(p.troco),
          })),
        },
      });

      // Persistir resultado
      if (resultado.status === 'autorizada') {
        await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, {
          nfceStatus:      'autorizada',
          nfceChave:       resultado.chave,
          nfceProtocolo:   resultado.protocolo,
          nfceXml:         resultado.xml,
          nfceQrcode:      resultado.qrcode,
          nfceAutorizadaEm: new Date(),
        });
      } else {
        await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, {
          nfceStatus:          'rejeitada',
          nfceCodRejeicao:     resultado.codRejeicao,
          nfceMotivoRejeicao:  resultado.motivoRejeicao,
        });
      }
    } catch (err: any) {
      this.logger.error(`Erro ao disparar NFC-e para venda ${sale.id}: ${err.message}`);
      try {
        await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, {
          nfceStatus: 'rejeitada',
          nfceMotivoRejeicao: err.message,
        });
      } catch (dbErr: any) {
        this.logger.error(`Erro fatal ao atualizar status de NFC-e (Venda ${sale.id}): ${dbErr.message}`);
      }
    }
  }

  private async atualizarStatusNfce(tenantId: string, databaseUrl: string, saleId: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    await prisma.sale.update({ where: { id: saleId }, data });
  }

  async findAll(page = 1, limit = 50) {
    const prisma = await this.getPrisma();
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.sale.count(),
      prisma.sale.findMany({
        include: {
          payments: true,
          items: { include: { product: true } },
          customer: true,
          operator: true,
        },
        orderBy: { createdAt: 'desc' },
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

  async getTodaySales(page = 1, limit = 50) {
    const prisma = await this.getPrisma();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.sale.count({ where: { createdAt: { gte: today } } }),
      prisma.sale.findMany({
        where: { createdAt: { gte: today } },
        include: {
          payments: true,
          items: { include: { product: true } },
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  /** Retorna apenas os campos de status NFC-e — usado pelo polling do frontend */
  async getNfceStatus(saleId: string) {
    const prisma = await this.getPrisma();
    return prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        nfceStatus: true,
        nfceNumero: true,
        nfceSerie: true,
        nfceChave: true,
        nfceProtocolo: true,
        nfceQrcode: true,
        nfceAutorizadaEm: true,
        nfceCodRejeicao: true,
        nfceMotivoRejeicao: true,
      },
    });
  }

  /** Emissão manual / Reemissão de NFC-e para vendas já salvas */
  async emitNfce(saleId: string, forceNewNumber = false) {
    const prisma = await this.getPrisma();
    
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: true, customer: true }
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');
    if (sale.nfceStatus === 'autorizada') throw new BadRequestException('NFC-e já autorizada para esta venda');

    // 1. Atualizar informações fiscais dos itens da venda com os dados mais recentes dos produtos
    for (const item of sale.items) {
      if (item.productId) {
        const currentProduct = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { 
            grupoTributacao: true,
            category: {
              include: {
                grupoTributacao: true
              }
            }
          }
        });
        if (currentProduct) {
          const gt = currentProduct.grupoTributacao || currentProduct.category?.grupoTributacao;
          const updatedFields = {
            productName: currentProduct.name,
            unit: currentProduct.unit || 'UN',
            ncm: currentProduct.ncm ?? null,
            cest: currentProduct.cest ?? null,
            cfop: gt?.cfop ?? '5102',
            origem: currentProduct.origem ?? 0,
            csosn: gt?.csosn ?? null,
            cstIcms: gt?.cstIcms ?? null,
            aliqIcms: Number(gt?.aliqIcms ?? 0),
            cstPis: gt?.cstPis ?? '99',
            aliqPis: Number(gt?.aliqPis ?? 0),
            cstCofins: gt?.cstCofins ?? '99',
            aliqCofins: Number(gt?.aliqCofins ?? 0),
          };

          await prisma.saleItem.update({
            where: { id: item.id },
            data: updatedFields
          });

          // Atualizar objeto em memória para a emissão em background
          Object.assign(item, {
            ...updatedFields,
            aliqIcms: new Prisma.Decimal(updatedFields.aliqIcms),
            aliqPis: new Prisma.Decimal(updatedFields.aliqPis),
            aliqCofins: new Prisma.Decimal(updatedFields.aliqCofins),
          });
        }
      }
    }

    const { tenantId, databaseUrl } = this.tenantContext.get();
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const configuredSerie = tenant?.nfceSerie || 1;

    let nfceNumero = sale.nfceNumero;
    let nfceSerie = sale.nfceSerie;

    // Se não tinha número, ou se forçamos um novo número
    if (!nfceNumero || forceNewNumber) {
       nfceSerie = configuredSerie;
       const numeracao = await prisma.numeracaoNfce.upsert({
          where: { serie: configuredSerie },
          update: { ultimo: { increment: 1 } },
          create: { serie: configuredSerie, ultimo: 1 },
       });
       nfceNumero = numeracao.ultimo;
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: { emitirNfce: true, nfceStatus: 'pendente', nfceNumero, nfceSerie }
    });

    sale.emitirNfce = true;
    sale.nfceNumero = nfceNumero;
    sale.nfceSerie = nfceSerie;

    setImmediate(() => this.dispararNfce(tenantId, databaseUrl, sale));

    return { message: 'Emissão de NFC-e solicitada com sucesso', status: 'pendente' };
  }

  /** Exportar XMLs das vendas do mês no formato ZIP */
  async exportNfceXmls(startDate: string, endDate: string) {
    const prisma = await this.getPrisma();

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        nfceStatus: 'autorizada',
        nfceXml: { not: null },
      },
      select: { nfceChave: true, nfceXml: true },
    });

    if (sales.length === 0) {
      throw new NotFoundException('Nenhum XML encontrado neste período.');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });

    sales.forEach((sale: any) => {
      archive.append(sale.nfceXml, { name: `${sale.nfceChave}-nfe.xml` });
    });

    archive.finalize();

    return new StreamableFile(archive);
  }

  private generateZipBuffer(sales: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      archive.on('data', (data) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err) => reject(err));

      sales.forEach((sale: any) => {
        archive.append(sale.nfceXml, { name: `${sale.nfceChave}-nfe.xml` });
      });

      archive.finalize();
    });
  }

  /** Exportar XMLs das vendas do mês no formato ZIP e enviar por e-mail */
  async exportNfceXmlsAndSendEmail(startDate: string, endDate: string, targetEmail?: string) {
    const { tenantId } = this.tenantContext.get();
    
    // Obter dados do emitente (Tenant)
    const tenant = await this.heartPrisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    
    const emailToUse = targetEmail || tenant.emailContador;
    
    if (!emailToUse) {
      throw new BadRequestException('E-mail do contador não configurado para esta empresa. Por favor, configure nas configurações ou informe um e-mail.');
    }

    const prisma = await this.getPrisma();

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        nfceStatus: 'autorizada',
        nfceXml: { not: null },
      },
      select: { nfceChave: true, nfceXml: true },
    });

    if (sales.length === 0) {
      throw new NotFoundException('Nenhum XML encontrado neste período.');
    }

    const zipBuffer = await this.generateZipBuffer(sales);
    
    const razaoSocial = tenant.razaoSocial || tenant.name || 'Empresa';
    const cnpj = tenant.cnpj ? tenant.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 'Não informado';
    
    const subject = `XMLs de NFC-e — ${razaoSocial} — Período ${startDate} a ${endDate}`;
    
    const text = `Prezado(a) Contador(a),\n\nSegue em anexo o arquivo ZIP contendo os XMLs das notas fiscais emitidas no período de ${startDate} a ${endDate}.\n\nDados do emitente:\nRazão Social: ${razaoSocial}\nCNPJ: ${cnpj}\n\nEste é um e-mail automático gerado pelo sistema PDV 7bar.`;
    
    const html = `
      <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #6366f1;">Exportação de XMLs de NFC-e</h2>
        <p>Prezado(a) Contador(a),</p>
        <p>Segue em anexo o arquivo comprimido (ZIP) contendo os arquivos XML das Notas Fiscais do Consumidor Eletrônicas (NFC-e) referentes ao período de <strong>${startDate}</strong> a <strong>${endDate}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4b5563;">Dados da Empresa Emitente</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 120px;">Razão Social:</td>
              <td style="padding: 4px 0;">${razaoSocial}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">CNPJ:</td>
              <td style="padding: 4px 0;">${cnpj}</td>
            </tr>
            ${tenant.telefone ? `<tr><td style="padding: 4px 0; font-weight: bold;">Contato:</td><td style="padding: 4px 0;">${tenant.telefone}</td></tr>` : ''}
          </table>
        </div>
        
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
          Este é um e-mail automático gerado pelo sistema PDV 7bar. Por favor, não responda a esta mensagem.
        </p>
      </div>
    `;

    await this.mailService.sendMail(
      emailToUse,
      subject,
      text,
      html,
      [
        {
          filename: `xmls_${startDate}_a_${endDate}.zip`,
          content: zipBuffer,
        }
      ]
    );

    return { message: 'XMLs exportados e enviados com sucesso para a contabilidade.' };
  }

  async cancel(saleId: string, reason: string) {
    const { tenantId } = this.tenantContext.get();
    const prisma = await this.getPrisma();

    const sale = await prisma.$transaction(async (tx: any) => {
      const existingSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: {
              lotConsumptions: {
                include: {
                  lot: true
                }
              }
            }
          }
        }
      });

      if (!existingSale) {
        throw new NotFoundException('Venda não encontrada.');
      }

      if (existingSale.status === 'cancelled') {
        throw new BadRequestException('Esta venda já está cancelada.');
      }

      // Estornar cada item consumido de volta aos lotes e produtos
      for (const item of existingSale.items) {
        // Reduzir contagem de vendas do produto pai
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { decrement: item.quantity } }
        });

        for (const consumption of item.lotConsumptions) {
          // 1. Estornar quantidade restante do lote
          await tx.stockLot.update({
            where: { id: consumption.lotId },
            data: { remaining: { increment: consumption.quantity } }
          });

          // 2. Incrementar estoque consolidado do produto pertencente ao lote
          await tx.product.update({
            where: { id: consumption.lot.productId },
            data: { stock: { increment: consumption.quantity } }
          });

          // 3. Registrar log de inventário para auditoria
          await tx.inventoryLog.create({
            data: {
              productId: consumption.lot.productId,
              type: 'IN',
              quantity: Number(consumption.quantity),
              costPrice: Number(consumption.lot.costPrice),
              reason: `Estorno Venda Cancelada (Venda: ${existingSale.id})`
            }
          });
        }
      }

      // Marcar venda como cancelada
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'cancelled',
          cancelReason: reason,
          cancelledAt: new Date()
        },
        include: {
          items: true,
          payments: true
        }
      });

      return updatedSale;
    });

    try {
      this.productsService.invalidateCache(tenantId);
    } catch (err) {
      this.logger.error(`Erro ao invalidar cache de produtos do tenant ${tenantId}: ${err.message}`);
    }

    return sale;
  }
}

