import { Injectable, BadRequestException, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { NfceService } from '../nfce/nfce.service';
import { Prisma } from '@prisma/client';
import archiver = require('archiver');

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
    private tenantContext: TenantContextService
  ) {}

  private async getPrisma() {
    const { tenantId, databaseUrl } = this.tenantContext.get();
    return this.tenantManager.getTenantClient(tenantId, databaseUrl);
  }

  async checkout(data: any) {
    const { userId } = this.tenantContext.get();
    let operatorId = data.operatorId || userId;
    const prisma = await this.getPrisma();

    return prisma.$transaction(async (tx: any) => {
      let subtotal = new Prisma.Decimal(0);
      const saleItemsData: any[] = [];

      // ─── 0. Ler configurações do tenant e validar caixa ────────────────────
      if (!data.cashRegisterId) {
        throw new BadRequestException('Não é possível realizar venda: Caixa não informado.');
      }

      const cashRegister = await tx.cashRegister.findUnique({
        where: { id: data.cashRegisterId }
      });

      if (!cashRegister || cashRegister.status !== 'open') {
        throw new BadRequestException('O caixa selecionado está fechado ou é inválido. Abra o caixa primeiro.');
      }

      const tenantSettings = await tx.tenantSettings.findUnique({ where: { id: 'singleton' } });
      const allowNegativeStock = tenantSettings?.allowNegativeStock ?? false;

      // ─── 1. Validar estoque e montar snapshot fiscal de cada item ───────────
      // OTIMIZAÇÃO CRÍTICA (Fase 1): Buscamos todos os produtos em lote (Batch Fetching)
      const productIds = data.items.map((item: any) => item.productId);
      const productsInDb = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { grupoTributacao: true },
      });

      // Cria um mapa para acesso rápido em memória O(1)
      const productMap = new Map(productsInDb.map((p: any) => [p.id, p]));

      const inventoryLogsToCreate: any[] = [];
      const productUpdatesPromises: any[] = [];

      for (const item of data.items) {
        const product = productMap.get(item.productId) as any;

        if (!product) {
          throw new BadRequestException(`Produto ${item.productId} não encontrado no banco de dados.`);
        }

        const qty = Number(item.quantity);

        // Valida estoque apenas se a flag estiver desativada (Validação em memória, zero queries extras)
        if (!allowNegativeStock && Number(product.stock) < qty) {
          throw new BadRequestException(`Estoque insuficiente para o produto: ${product.name} (disponível: ${product.stock}, tentado: ${qty})`);
        }

        // Prepara a query de atualização de estoque para execução paralela futura
        productUpdatesPromises.push(
          tx.product.update({
            where: { id: item.productId },
            data: { 
              stock: { decrement: new Prisma.Decimal(qty) },
              salesCount: { increment: qty }
            },
          })
        );

        const priceUnit = new Prisma.Decimal(item.priceUnit);
        const qtyDecimal = new Prisma.Decimal(qty);
        const itemSubtotal = priceUnit.mul(qtyDecimal).toDecimalPlaces(2);
        
        // Accumulate subtotal (requires subtotal to be Prisma.Decimal as well)
        subtotal = subtotal.add(itemSubtotal);

        const gt = product.grupoTributacao;

        // Snapshot fiscal IMUTÁVEL — congelado no momento da venda
        saleItemsData.push({
          productId: product.id,
          productName: item.fiscalSnapshot?.productName ?? product.name,
          unit: item.fiscalSnapshot?.unit ?? (product.unit || 'UN'),
          quantity: qty,
          priceUnit,
          discount: item.fiscalSnapshot?.discount ?? 0,
          subtotal: item.fiscalSnapshot?.subtotal ?? itemSubtotal,
          // Fiscal
          ncm:        item.fiscalSnapshot?.ncm ?? product.ncm   ?? null,
          cest:       item.fiscalSnapshot?.cest ?? product.cest  ?? null,
          cfop:       item.fiscalSnapshot?.cfop ?? gt?.cfop      ?? '5102',
          origem:     item.fiscalSnapshot?.origem ?? product.origem ?? 0,
          csosn:      item.fiscalSnapshot?.csosn ?? gt?.csosn     ?? null,
          cstIcms:    item.fiscalSnapshot?.cstIcms ?? gt?.cstIcms   ?? null,
          aliqIcms:   item.fiscalSnapshot?.aliqIcms ?? Number(gt?.aliqIcms ?? 0),
          valorIcms:  0, // calculado pelo PHP no momento da emissão
          cstPis:     item.fiscalSnapshot?.cstPis ?? gt?.cstPis    ?? '99',
          aliqPis:    item.fiscalSnapshot?.aliqPis ?? Number(gt?.aliqPis ?? 0),
          valorPis:   0,
          cstCofins:  item.fiscalSnapshot?.cstCofins ?? gt?.cstCofins ?? '99',
          aliqCofins: item.fiscalSnapshot?.aliqCofins ?? Number(gt?.aliqCofins ?? 0),
          valorCofins: 0,
        });

        // Prepara Log de Inventário para bulk insert (createMany)
        inventoryLogsToCreate.push({
          productId: product.id,
          type: 'SALE',
          quantity: qty,
          reason: 'Venda PDV',
        });
      }

      // Dispara todas as atualizações de estoque e cria todos os logs PARALELAMENTE
      await Promise.all([
        ...productUpdatesPromises,
        tx.inventoryLog.createMany({ data: inventoryLogsToCreate })
      ]);

      const discount = new Prisma.Decimal(data.discount || 0);
      const total = subtotal.sub(discount).toDecimalPlaces(2);

      // ─── 2. Montar pagamentos com tPag SEFAZ ────────────────────────────────
      const paymentsData = data.payments.map((pay: any) => ({
        tPag:   TPAG_MAP[pay.method] ?? '99',
        method: pay.method,
        value:  Number(pay.value),
        troco:  Number(pay.troco || 0),
      }));

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
      // Valida se o operador existe para evitar erro de Foreign Key
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
          cashRegisterId: data.cashRegisterId,
          subtotal,
          discount,
          total,
          status:         'completed',
          emitirNfce,
          nfceStatus:     emitirNfce ? 'pendente' : null,
          nfceNumero,
          nfceSerie:      emitirNfce ? (data.nfceSerie ?? 1) : null,
          consumidorCpf:  data.customerCpf  || null,
          consumidorNome: data.customerName || null,
          // Se for offline contingency, usa a data original (caso contrário Prisma cria now())
          ...(data.offlineContingency && data.offlineCreatedAt ? { createdAt: new Date(data.offlineCreatedAt) } : {}),
          items:    { create: saleItemsData },
          payments: { create: paymentsData },
        },
        include: {
          items:    true,
          payments: true,
          customer: true,
        },
      });

      // ─── 5. Disparar emissão NFC-e (se solicitada) — fora da transação principal ──
      // A emissão é feita após o commit para não bloquear a transação se o PHP demorar
      if (emitirNfce) {
        const { tenantId, databaseUrl } = this.tenantContext.get();
        setImmediate(() => this.dispararNfce(tenantId, databaseUrl, sale));
      }

      return sale;
    });
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
  async emitNfce(saleId: string) {
    const prisma = await this.getPrisma();
    
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: true, customer: true }
    });

    if (!sale) throw new NotFoundException('Venda não encontrada');
    if (sale.nfceStatus === 'autorizada') throw new BadRequestException('NFC-e já autorizada para esta venda');

    let nfceNumero = sale.nfceNumero;
    let nfceSerie = sale.nfceSerie;
    if (!nfceNumero) {
       nfceSerie = 1;
       const numeracao = await prisma.numeracaoNfce.upsert({
          where: { serie: nfceSerie },
          update: { ultimo: { increment: 1 } },
          create: { serie: nfceSerie, ultimo: 1 },
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

    const { tenantId, databaseUrl } = this.tenantContext.get();
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
}
