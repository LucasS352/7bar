import { Injectable, BadRequestException, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { TenantConnectionManager } from '../prisma/tenant-prisma.service';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import { NfceService } from '../nfce/nfce.service';
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
  ) {}

  async checkout(tenantId: string, databaseUrl: string, operatorId: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

    return prisma.$transaction(async (tx: any) => {
      let subtotal = 0;
      const saleItemsData: any[] = [];

      // ─── 0. Ler configurações do tenant ────────────────────────────────────
      const tenantSettings = await tx.tenantSettings.findUnique({ where: { id: 'singleton' } });
      const allowNegativeStock = tenantSettings?.allowNegativeStock ?? false;

      // ─── 1. Validar estoque e montar snapshot fiscal de cada item ───────────
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { grupoTributacao: true },
        });

        if (!product) {
          throw new BadRequestException(`Produto ${item.productId} não encontrado.`);
        }

        const qty = Number(item.quantity);

        // Valida estoque apenas se a flag estiver desativada
        if (!allowNegativeStock && Number(product.stock) < qty) {
          throw new BadRequestException(`Estoque insuficiente: ${product.name} (disponível: ${product.stock})`);
        }

        // Decrementa estoque (pode ficar negativo se flag ativa)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: qty } },
        });


        const priceUnit = Number(item.priceUnit);
        const itemSubtotal = parseFloat((priceUnit * qty).toFixed(2));
        subtotal += itemSubtotal;

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

        // Registra movimentação de estoque
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            type: 'SALE',
            quantity: qty,
            reason: 'Venda PDV',
          },
        });
      }

      const discount = Number(data.discount || 0);
      const total = parseFloat((subtotal - discount).toFixed(2));

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
      const sale = await tx.sale.create({
        data: {
          customerId:     data.customerId || null,
          operatorId,
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
        setImmediate(() => this.dispararNfce(sale, tenantId, databaseUrl));
      }

      return sale;
    });
  }

  /**
   * Dispara a emissão NFC-e de forma assíncrona após a venda ser salva.
   * Atualiza o registro da venda com o resultado.
   */
  private async dispararNfce(sale: any, tenantId: string, databaseUrl: string) {
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
      await this.atualizarStatusNfce(tenantId, databaseUrl, sale.id, {
        nfceStatus: 'rejeitada',
        nfceMotivoRejeicao: err.message,
      });
    }
  }

  private async atualizarStatusNfce(tenantId: string, databaseUrl: string, saleId: string, data: any) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    await prisma.sale.update({ where: { id: saleId }, data });
  }

  async findAll(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    return prisma.sale.findMany({
      include: {
        payments: true,
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodaySales(tenantId: string, databaseUrl: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return prisma.sale.findMany({
      where: { createdAt: { gte: today } },
      include: {
        payments: true,
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Retorna apenas os campos de status NFC-e — usado pelo polling do frontend */
  async getNfceStatus(tenantId: string, databaseUrl: string, saleId: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
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
  async emitNfce(tenantId: string, databaseUrl: string, saleId: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);
    
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

    setImmediate(() => this.dispararNfce(sale, tenantId, databaseUrl));

    return { message: 'Emissão de NFC-e solicitada com sucesso', status: 'pendente' };
  }

  /** Exportar XMLs das vendas do mês no formato ZIP */
  async exportNfceXmls(tenantId: string, databaseUrl: string, startDate: string, endDate: string) {
    const prisma = await this.tenantManager.getTenantClient(tenantId, databaseUrl);

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
