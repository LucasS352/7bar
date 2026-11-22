import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { HeartPrismaService } from '../prisma/heart-prisma.service';
import {
  assertPayloadUnderLimit,
  buildSafeLeadgerPhotoUrl,
  clampBillingDay,
  clampVersion,
  computeRetryDelayMs,
  formatBrtYmd,
  isValidReferenceMonth,
  isValidYmdDate,
  makeSafeExternalId,
  mapTenantStatusToLeadgerBaseStatus,
  nextBillingDateYmd,
  normalizeDocument,
  normalizeEmail,
  normalizePaymentMethod,
  normalizePhoneE164,
  serializeBaseUpsertBatch,
  serializeClientUpsert,
  serializeInvoiceUpsert,
  signLeadgerPayload,
  toCentavos,
  VALID_PAYMENT_METHODS,
} from './leadger-crypto';
import type {
  LeadgerBasePayload,
  LeadgerBaseStatus,
  LeadgerClientPayload,
  LeadgerClientStatus,
  LeadgerInvoicePayload,
  LeadgerInvoiceStatus,
  LeadgerOutboxStatus,
  LeadgerPaymentMethod,
  LeadgerWebhookConfigStatus,
} from './leadger.types';

const MAX_TRANSIENT_RETRIES = 12;
const PROCESSING_LOCK_TIMEOUT_MS = 120_000;

export type LeadgerFetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export function extractLogoIdFromUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const match = String(logoUrl).match(/\/uploads\/logos\/([A-Za-z0-9._-]+)$/);
  return match?.[1] ?? null;
}

export function isMissingLeadgerTablesError(err: any): boolean {
  if (err?.code === 'P2021') return true;
  const msg = String(err?.message ?? '');
  return (
    /(billing_clients|billing_base_configs|billing_invoices|leadger_outbox_events)/i.test(msg) &&
    /(doesn't exist|does not exist|unknown table)/i.test(msg)
  );
}

@Injectable()
export class LeadgerService {
  private readonly logger = new Logger(LeadgerService.name);
  private workerRunning = false;
  private monthlyCronRunning = false;
  private httpImpl: LeadgerFetchLike = (url, init) => fetch(url, init) as any;

  constructor(private readonly heartPrisma: HeartPrismaService) {}

  /** Permite injetar transport fake nos testes unitários */
  setHttpClientForTest(fn: LeadgerFetchLike) {
    this.httpImpl = fn;
  }

  getRuntimeConfig() {
    const url = (process.env.LEADGER_WEBHOOK_URL ?? '').trim();
    const source = (process.env.LEADGER_WEBHOOK_SOURCE ?? '').trim();
    const secret = process.env.LEADGER_WEBHOOK_SECRET ?? '';
    const webhookEnabled = process.env.LEADGER_WEBHOOK_ENABLED === 'true';
    const photoSyncEnabled = process.env.LEADGER_PHOTO_SYNC_ENABLED === 'true';
    const publicAppUrl = (process.env.PUBLIC_APP_URL ?? '').trim();
    const testPhotoUrl = buildSafeLeadgerPhotoUrl(publicAppUrl, 'sample.webp');

    let urlHost: string | null = null;
    try {
      if (url) urlHost = new URL(url).host;
    } catch {
      urlHost = null;
    }

    let photoPublicHost: string | null = null;
    try {
      if (publicAppUrl) photoPublicHost = new URL(publicAppUrl).host;
    } catch {
      photoPublicHost = null;
    }

    return {
      url,
      source,
      secret,
      webhookEnabled,
      photoSyncEnabled,
      publicAppUrl,
      configured: Boolean(urlHost && source && secret.length > 0),
      hasUrl: Boolean(urlHost),
      hasSource: Boolean(source),
      hasSecret: secret.length > 0,
      urlHost,
      photoPublicHost,
      photoHostValid: Boolean(testPhotoUrl),
    };
  }

  private assertNotMissingTables(err: any): never {
    if (isMissingLeadgerTablesError(err)) {
      throw new BadRequestException(
        'As tabelas da integração Leadger no banco Heart ainda não foram criadas. Marque "Incluir Heart" e clique em "Atualizar Bancos" na aba Gestão de Tenants.',
      );
    }
    throw err;
  }

  async getStatus(): Promise<LeadgerWebhookConfigStatus> {
    const cfg = this.getRuntimeConfig();
    let tablesReady = true;
    try {
      await (this.heartPrisma as any).leadgerOutboxEvent.count({ take: 1 });
    } catch (err) {
      if (isMissingLeadgerTablesError(err)) {
        tablesReady = false;
      } else {
        throw err;
      }
    }

    return {
      tablesReady,
      webhookEnabled: cfg.webhookEnabled,
      photoSyncEnabled: cfg.photoSyncEnabled,
      configured: cfg.configured,
      hasUrl: cfg.hasUrl,
      hasSource: cfg.hasSource,
      hasSecret: cfg.hasSecret,
      urlHost: cfg.urlHost,
      source: cfg.source || null,
      photoPublicHost: cfg.photoPublicHost,
      photoHostValid: cfg.photoHostValid,
    };
  }

  // ---------------------------------------------------------------------------
  //  Construtores de Payloads Contrato v1
  // ---------------------------------------------------------------------------

  private buildClientPayload(
    client: {
      externalId: string;
      version: number;
      name: string;
      document: string | null;
      email: string | null;
      phone: string | null;
      status: string;
      notes: string | null;
      photoLogoId: string | null;
      photoVersion: number;
      photoRemoved: boolean;
    },
    includePhoto: boolean,
  ): LeadgerClientPayload {
    const payload: LeadgerClientPayload = {
      externalId: client.externalId,
      version: clampVersion(client.version),
      name: String(client.name).trim().slice(0, 200) || 'Cliente PDV',
      document: normalizeDocument(client.document),
      email: normalizeEmail(client.email),
      phone: normalizePhoneE164(client.phone),
      status: client.status === 'inactive' ? 'inactive' : 'active',
      notes: client.notes ? String(client.notes) : null,
    };

    if (includePhoto) {
      if (client.photoRemoved) {
        payload.photo = null;
      } else if (client.photoLogoId && client.photoVersion > 0) {
        const cfg = this.getRuntimeConfig();
        const sourceUrl = buildSafeLeadgerPhotoUrl(cfg.publicAppUrl, client.photoLogoId);
        if (sourceUrl) {
          payload.photo = {
            sourceUrl,
            version: clampVersion(client.photoVersion),
          };
        }
      }
    }

    return payload;
  }

  private buildBasePayload(base: {
    baseExternalId: string;
    baseVersion: number;
    baseName: string;
    monthlyAmountCents: number;
    billingDay: number;
    startDate: string;
    endDate: string | null;
    effectiveDate: string;
    status: string;
  }): LeadgerBasePayload {
    const startDate = isValidYmdDate(base.startDate) ? base.startDate : formatBrtYmd(new Date());
    const effectiveDate =
      isValidYmdDate(base.effectiveDate) && base.effectiveDate >= startDate ? base.effectiveDate : startDate;
    const status: LeadgerBaseStatus =
      base.status === 'paused' || base.status === 'cancelled' ? base.status : 'active';

    return {
      externalId: base.baseExternalId,
      version: clampVersion(base.baseVersion),
      name: String(base.baseName).trim().slice(0, 200) || 'Base PDV',
      monthlyAmount: Math.max(0, Math.trunc(base.monthlyAmountCents)),
      billingDay: clampBillingDay(base.billingDay),
      startDate,
      endDate: base.endDate && isValidYmdDate(base.endDate) ? base.endDate : null,
      effectiveDate,
      status,
    };
  }

  private buildInvoicePayload(invoice: {
    externalId: string;
    version: number;
    description: string;
    amountCents: number;
    dueDate: string;
    referenceMonth: string;
    status: string;
    paidAt: Date | null;
    paymentMethod: string | null;
  }): LeadgerInvoicePayload {
    const status: LeadgerInvoiceStatus =
      invoice.status === 'paid' || invoice.status === 'cancelled' ? invoice.status : 'pending';
    return {
      externalId: invoice.externalId,
      version: clampVersion(invoice.version),
      description: String(invoice.description).trim().slice(0, 300) || 'Mensalidade PDV',
      amount: invoice.amountCents,
      dueDate: invoice.dueDate,
      referenceMonth: invoice.referenceMonth,
      status,
      paidAt: status === 'paid' ? (invoice.paidAt ?? new Date()).toISOString() : null,
      paymentMethod: status === 'paid' ? normalizePaymentMethod(invoice.paymentMethod) : null,
    };
  }

  private async enqueueOutboxTx(
    tx: any,
    params: {
      eventId: string;
      eventType: 'base.upsert' | 'invoice.upsert' | 'client.upsert';
      entityType: 'base' | 'invoice' | 'client';
      entityExternalId: string;
      baseExternalId?: string | null;
      entityVersion: number;
      payloadJson: string;
    },
  ) {
    assertPayloadUnderLimit(params.payloadJson);
    return tx.leadgerOutboxEvent.create({
      data: {
        eventId: params.eventId,
        eventType: params.eventType,
        entityType: params.entityType,
        entityExternalId: params.entityExternalId,
        baseExternalId: params.baseExternalId ?? null,
        entityVersion: params.entityVersion,
        payloadJson: params.payloadJson,
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  //  Gestão de Clientes Titulares (1 Cliente -> N Bases) & Bases
  // ---------------------------------------------------------------------------

  async listBillingClients() {
    try {
      return await (this.heartPrisma as any).billingClient.findMany({
        include: {
          bases: {
            select: {
              id: true,
              tenantId: true,
              baseExternalId: true,
              baseName: true,
              status: true,
              syncEnabled: true,
              monthlyAmountCents: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async createBillingClient(body: {
    name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: LeadgerClientStatus;
    notes?: string | null;
    externalId?: string;
  }) {
    const name = String(body?.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome do cliente é obrigatório.');
    if (name.length > 200) throw new BadRequestException('Nome do cliente deve ter até 200 caracteres.');

    const rawEmail = body?.email ? String(body.email).trim() : null;
    const normalizedEmail = rawEmail ? normalizeEmail(rawEmail) : null;
    if (rawEmail && !normalizedEmail) {
      throw new BadRequestException('E-mail do cliente inválido.');
    }

    const externalId = body?.externalId?.trim()
      ? makeSafeExternalId('cli', body.externalId.trim().replace(/^cli-/, ''))
      : makeSafeExternalId('cli', randomUUID());

    try {
      return await (this.heartPrisma as any).billingClient.create({
        data: {
          externalId,
          version: 1,
          name,
          document: normalizeDocument(body.document),
          email: normalizedEmail,
          phone: normalizePhoneE164(body.phone),
          status: body.status === 'inactive' ? 'inactive' : 'active',
          notes: body.notes?.trim() || null,
        },
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async updateBillingClient(
    clientId: string,
    body: {
      name?: string;
      document?: string | null;
      email?: string | null;
      phone?: string | null;
      status?: LeadgerClientStatus;
      notes?: string | null;
      removePhoto?: boolean;
    },
  ) {
    try {
      const occurredAt = new Date().toISOString();
      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const existing = await tx.billingClient.findUnique({
          where: { id: clientId },
          include: { bases: { select: { syncEnabled: true, baseSyncedAt: true } } },
        });
        if (!existing) throw new NotFoundException('Cliente pagador não encontrado.');

        const nextName = body.name !== undefined ? String(body.name).trim().slice(0, 200) : existing.name;
        if (!nextName) throw new BadRequestException('Nome do cliente não pode ficar vazio.');

        let nextEmail = existing.email;
        if (body.email !== undefined) {
          const raw = body.email ? String(body.email).trim() : null;
          nextEmail = raw ? normalizeEmail(raw) : null;
          if (raw && !nextEmail) throw new BadRequestException('E-mail do cliente inválido.');
        }

        const nextDoc = body.document !== undefined ? normalizeDocument(body.document) : existing.document;
        const nextPhone = body.phone !== undefined ? normalizePhoneE164(body.phone) : existing.phone;
        const nextStatus: LeadgerClientStatus =
          body.status !== undefined ? (body.status === 'inactive' ? 'inactive' : 'active') : existing.status;
        const nextNotes = body.notes !== undefined ? (body.notes?.trim() || null) : existing.notes;
        const photoRemoved = body.removePhoto === true ? true : existing.photoRemoved;

        const nextVersion = clampVersion(existing.version + 1);
        const updated = await tx.billingClient.update({
          where: { id: clientId },
          data: {
            version: nextVersion,
            name: nextName,
            document: nextDoc,
            email: nextEmail,
            phone: nextPhone,
            status: nextStatus,
            notes: nextNotes,
            photoRemoved,
            ...(body.removePhoto === true ? { photoLogoId: null } : {}),
          },
        });

        const hasSyncedBase = existing.bases.some((b: any) => b.syncEnabled && b.baseSyncedAt);
        if (hasSyncedBase) {
          const cfg = this.getRuntimeConfig();
          const built = serializeClientUpsert({
            occurredAt,
            client: this.buildClientPayload(updated, cfg.photoSyncEnabled && body.removePhoto === true),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: built.eventId,
            eventType: 'client.upsert',
            entityType: 'client',
            entityExternalId: updated.externalId,
            entityVersion: updated.version,
            payloadJson: built.json,
          });
        }

        return updated;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  /** Garante BillingClient + BillingBaseConfig existentes para o tenant dentro de uma transação */
  private async ensureBaseForTenantTx(tx: any, tenantId: string) {
    const existing = await tx.billingBaseConfig.findUnique({
      where: { tenantId },
      include: { billingClient: true },
    });
    if (existing) return existing;

    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada.');

    const clientExternalId = makeSafeExternalId('cli', tenant.id);
    let client = await tx.billingClient.findUnique({ where: { externalId: clientExternalId } });
    if (!client) {
      const logoId = extractLogoIdFromUrl(tenant.logoUrl);
      client = await tx.billingClient.create({
        data: {
          externalId: clientExternalId,
          version: 1,
          name: (tenant.razaoSocial || tenant.nomeFantasia || tenant.name || 'Cliente PDV').trim().slice(0, 200),
          document: normalizeDocument(tenant.cnpj),
          email: normalizeEmail(tenant.emailContato || tenant.emailContador),
          phone: normalizePhoneE164(tenant.telefoneContato || tenant.telefone),
          status: tenant.status === 'inactive' ? 'inactive' : 'active',
          notes: tenant.observacoes ?? null,
          photoLogoId: logoId,
          photoVersion: logoId ? 1 : 0,
        },
      });
    }

    const startDate = formatBrtYmd(tenant.createdAt ?? new Date());
    const dueFromTenant = tenant.mensalidadeVencimento
      ? formatBrtYmd(new Date(tenant.mensalidadeVencimento))
      : null;
    const derivedDay = dueFromTenant
      ? Number(dueFromTenant.slice(8, 10))
      : Number(startDate.slice(8, 10));

    return tx.billingBaseConfig.create({
      data: {
        tenantId: tenant.id,
        billingClientId: client.id,
        baseExternalId: makeSafeExternalId('base', tenant.id),
        baseName: (tenant.nomeFantasia || tenant.name || tenant.razaoSocial || 'Base PDV').trim().slice(0, 200),
        baseVersion: 1,
        monthlyAmountCents: Math.max(0, Math.round(Number(tenant.mensalidadeValor ?? 0) * 100)),
        billingDay: Math.max(1, Math.min(31, derivedDay || 10)),
        startDate,
        endDate: null,
        effectiveDate: startDate,
        status: mapTenantStatusToLeadgerBaseStatus(tenant.status),
        syncEnabled: false,
      },
      include: { billingClient: true },
    });
  }

  async getTenantLeadgerDetails(tenantId: string) {
    try {
      const base = await (this.heartPrisma as any).$transaction(async (tx: any) =>
        this.ensureBaseForTenantTx(tx, tenantId),
      );
      const [invoices, recentEvents] = await Promise.all([
        (this.heartPrisma as any).billingInvoice.findMany({
          where: { tenantId },
          orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
          take: 50,
        }),
        (this.heartPrisma as any).leadgerOutboxEvent.findMany({
          where: {
            OR: [
              { baseExternalId: base.baseExternalId },
              { entityExternalId: base.billingClient.externalId },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
        }),
      ]);

      return {
        client: base.billingClient,
        base: {
          ...base,
          billingClient: undefined,
        },
        invoices,
        outboxEvents: recentEvents,
      };
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async updateTenantBaseConfig(
    tenantId: string,
    body: {
      billingClientId?: string;
      baseName?: string;
      monthlyAmount?: number;
      billingDay?: number;
      startDate?: string;
      endDate?: string | null;
      effectiveDate?: string;
      status?: LeadgerBaseStatus;
      syncEnabled?: boolean;
    },
  ) {
    try {
      const occurredAt = new Date().toISOString();
      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const current = await this.ensureBaseForTenantTx(tx, tenantId);
        const targetClientId = body.billingClientId?.trim() || current.billingClientId;
        const targetClient = await tx.billingClient.findUnique({ where: { id: targetClientId } });
        if (!targetClient) throw new NotFoundException('Cliente titular selecionado não existe.');

        const nextStartDate = body.startDate ?? current.startDate;
        if (!isValidYmdDate(nextStartDate)) throw new BadRequestException('startDate deve ser YYYY-MM-DD válido.');

        const nextEndDate = body.endDate === undefined ? current.endDate : body.endDate;
        if (nextEndDate !== null && nextEndDate !== '' && !isValidYmdDate(nextEndDate)) {
          throw new BadRequestException('endDate deve ser YYYY-MM-DD válido.');
        }

        const nextEffectiveDate = body.effectiveDate ?? current.effectiveDate;
        if (!isValidYmdDate(nextEffectiveDate)) {
          throw new BadRequestException('effectiveDate deve ser YYYY-MM-DD válido.');
        }
        if (nextEffectiveDate < nextStartDate) {
          throw new BadRequestException('effectiveDate não pode ser anterior a startDate.');
        }

        const nextBillingDay = body.billingDay !== undefined ? clampBillingDay(body.billingDay) : current.billingDay;
        const nextAmountCents =
          body.monthlyAmount !== undefined
            ? toCentavos(body.monthlyAmount, true)
            : current.monthlyAmountCents;
        const nextBaseName =
          body.baseName !== undefined ? String(body.baseName).trim().slice(0, 200) : current.baseName;
        if (!nextBaseName) throw new BadRequestException('Nome da base é obrigatório.');

        const nextStatus: LeadgerBaseStatus =
          body.status === 'active' || body.status === 'paused' || body.status === 'cancelled'
            ? body.status
            : (current.status as LeadgerBaseStatus);

        const nextSyncEnabled = body.syncEnabled !== undefined ? Boolean(body.syncEnabled) : current.syncEnabled;

        const amountChanged = nextAmountCents !== current.monthlyAmountCents;
        const contractFieldsChanged =
          amountChanged ||
          targetClientId !== current.billingClientId ||
          nextBaseName !== current.baseName ||
          nextBillingDay !== current.billingDay ||
          nextStartDate !== current.startDate ||
          (nextEndDate || null) !== current.endDate ||
          nextEffectiveDate !== current.effectiveDate ||
          nextStatus !== current.status;

        const nextVersion = contractFieldsChanged
          ? clampVersion(current.baseVersion + 1)
          : current.baseVersion;

        const updatedBase = await tx.billingBaseConfig.update({
          where: { id: current.id },
          data: {
            billingClientId: targetClient.id,
            baseName: nextBaseName,
            monthlyAmountCents: nextAmountCents,
            billingDay: nextBillingDay,
            startDate: nextStartDate,
            endDate: nextEndDate ? nextEndDate : null,
            effectiveDate: nextEffectiveDate,
            status: nextStatus,
            syncEnabled: nextSyncEnabled,
            baseVersion: nextVersion,
          },
          include: { billingClient: true },
        });

        // Espelha valor no campo legado mensalidadeValor do Tenant para manter coerência no calendário
        if (amountChanged) {
          await tx.tenant.update({
            where: { id: tenantId },
            data: { mensalidadeValor: Number((nextAmountCents / 100).toFixed(2)) },
          });
        }

        // Reajuste de mensalidade positiva recalcula faturas abertas >= effectiveDate (Seção 6); pagas preservadas!
        if (amountChanged && nextAmountCents > 0) {
          const pendingToRecalc = await tx.billingInvoice.findMany({
            where: {
              baseConfigId: current.id,
              status: 'pending',
              dueDate: { gte: nextEffectiveDate },
            },
          });
          for (const inv of pendingToRecalc) {
            await tx.billingInvoice.update({
              where: { id: inv.id },
              data: {
                amountCents: nextAmountCents,
                version: clampVersion(inv.version + 1),
              },
            });
          }
        }

        // Só emite snapshot se base já estava sincronizada antes E continua com syncEnabled = true
        if (updatedBase.syncEnabled && updatedBase.baseSyncedAt && contractFieldsChanged) {
          const built = serializeBaseUpsertBatch({
            occurredAt,
            client: this.buildClientPayload(updatedBase.billingClient, false),
            base: this.buildBasePayload(updatedBase),
            invoices: [],
          });
          await this.enqueueOutboxTx(tx, {
            eventId: built.primaryEventId,
            eventType: 'base.upsert',
            entityType: 'base',
            entityExternalId: updatedBase.baseExternalId,
            baseExternalId: updatedBase.baseExternalId,
            entityVersion: updatedBase.baseVersion,
            payloadJson: built.primaryJson,
          });
        }

        return updatedBase;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  /**
   * Emite base.upsert completo (exigindo >= 1 fatura caso base ainda não vinculada)
   * + client.upsert separado com foto caso LEADGER_PHOTO_SYNC_ENABLED=true (Seção 6 e 11).
   */
  async enqueueBaseSync(tenantId: string) {
    try {
      const occurredAt = new Date().toISOString();
      const cfg = this.getRuntimeConfig();

      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const base = await this.ensureBaseForTenantTx(tx, tenantId);
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException('Empresa não encontrada.');

        let invoices = await tx.billingInvoice.findMany({
          where: { baseConfigId: base.id },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        });

        // Se base ainda não vinculada e não tem fatura ainda, gera a fatura inicial obrigatória (Seção 6)
        if (!base.baseSyncedAt && invoices.length === 0) {
          if (base.monthlyAmountCents <= 0) {
            throw new BadRequestException(
              'Defina uma mensalidade maior que R$ 0,00 ou lance uma fatura antes da primeira sincronização com o Leadger.',
            );
          }
          const initialDue = tenant.mensalidadeVencimento
            ? formatBrtYmd(new Date(tenant.mensalidadeVencimento))
            : nextBillingDateYmd(formatBrtYmd(new Date()), base.billingDay);
          const refMonth = initialDue.slice(0, 7);
          const createdInv = await this.createInvoiceTx(tx, base, {
            description: `${base.billingClient.name} — Mensalidade ${refMonth.slice(5, 7)}/${refMonth.slice(0, 4)}`,
            amountCents: base.monthlyAmountCents,
            dueDate: initialDue,
            referenceMonth: refMonth,
          });
          invoices = [createdInv];
        }

        const updatedBase = base.syncEnabled
          ? base
          : await tx.billingBaseConfig.update({
              where: { id: base.id },
              data: { syncEnabled: true },
              include: { billingClient: true },
            });

        const built = serializeBaseUpsertBatch({
          occurredAt,
          client: this.buildClientPayload(updatedBase.billingClient, false),
          base: this.buildBasePayload(updatedBase),
          invoices: invoices.map((inv: any) => this.buildInvoicePayload(inv)),
        });

        const primaryOutbox = await this.enqueueOutboxTx(tx, {
          eventId: built.primaryEventId,
          eventType: 'base.upsert',
          entityType: 'base',
          entityExternalId: updatedBase.baseExternalId,
          baseExternalId: updatedBase.baseExternalId,
          entityVersion: updatedBase.baseVersion,
          payloadJson: built.primaryJson,
        });

        for (const extra of built.extraInvoices) {
          await this.enqueueOutboxTx(tx, {
            eventId: extra.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: extra.externalId,
            baseExternalId: updatedBase.baseExternalId,
            entityVersion: extra.version,
            payloadJson: extra.json,
          });
        }

        // Envio separado da foto (Seção 11) após base.upsert quando foto estiver habilitada
        if (
          cfg.photoSyncEnabled &&
          updatedBase.billingClient.photoLogoId &&
          updatedBase.billingClient.photoVersion > updatedBase.billingClient.lastSyncedPhotoVersion
        ) {
          const clientPayload = this.buildClientPayload(updatedBase.billingClient, true);
          if (clientPayload.photo) {
            const clientEvt = serializeClientUpsert({
              occurredAt,
              client: clientPayload,
            });
            await this.enqueueOutboxTx(tx, {
              eventId: clientEvt.eventId,
              eventType: 'client.upsert',
              entityType: 'client',
              entityExternalId: updatedBase.billingClient.externalId,
              baseExternalId: updatedBase.baseExternalId,
              entityVersion: updatedBase.billingClient.version,
              payloadJson: clientEvt.json,
            });
          }
        }

        return {
          outboxEventId: primaryOutbox.id,
          eventId: primaryOutbox.eventId,
          invoicesCount: invoices.length,
        };
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  // ---------------------------------------------------------------------------
  //  Ciclo de Faturas (Criar, Pagar, Editar, Estornar, Cancelar)
  // ---------------------------------------------------------------------------

  private async createInvoiceTx(
    tx: any,
    base: any,
    params: {
      description: string;
      amountCents: number;
      dueDate: string;
      referenceMonth: string;
      status?: LeadgerInvoiceStatus;
      paidAt?: Date | null;
      paymentMethod?: LeadgerPaymentMethod | null;
      paymentLogId?: string | null;
    },
  ) {
    if (params.amountCents <= 0) {
      throw new BadRequestException('Valor da fatura deve ser maior que zero.');
    }
    if (!isValidYmdDate(params.dueDate)) {
      throw new BadRequestException(`dueDate inválida: "${params.dueDate}"`);
    }
    if (!isValidReferenceMonth(params.referenceMonth)) {
      throw new BadRequestException(`referenceMonth inválido: "${params.referenceMonth}"`);
    }

    const existingSameMonth = await tx.billingInvoice.count({
      where: { baseConfigId: base.id, referenceMonth: params.referenceMonth },
    });
    const suffix = existingSameMonth > 0 ? `-${existingSameMonth + 1}` : '';
    const externalId = makeSafeExternalId('fat', `${base.tenantId}-${params.referenceMonth}${suffix}`);

    return tx.billingInvoice.create({
      data: {
        tenantId: base.tenantId,
        baseConfigId: base.id,
        externalId,
        version: 1,
        description: params.description.trim().slice(0, 300),
        amountCents: params.amountCents,
        dueDate: params.dueDate,
        referenceMonth: params.referenceMonth,
        status: params.status ?? 'pending',
        paidAt: params.status === 'paid' ? (params.paidAt ?? new Date()) : null,
        paymentMethod: params.status === 'paid' ? (params.paymentMethod ?? null) : null,
        paymentLogId: params.paymentLogId ?? null,
      },
    });
  }

  async createInvoice(
    tenantId: string,
    body: {
      description?: string;
      amount?: number;
      dueDate?: string;
      referenceMonth?: string;
    },
  ) {
    try {
      const occurredAt = new Date().toISOString();
      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const base = await this.ensureBaseForTenantTx(tx, tenantId);
        const amountCents =
          body.amount !== undefined ? toCentavos(body.amount, false) : base.monthlyAmountCents;
        if (amountCents <= 0) {
          throw new BadRequestException('Informe um valor maior que R$ 0,00 para a fatura.');
        }

        const dueDate =
          body.dueDate && body.dueDate.trim()
            ? body.dueDate.trim()
            : nextBillingDateYmd(formatBrtYmd(new Date()), base.billingDay);
        const referenceMonth =
          body.referenceMonth && body.referenceMonth.trim()
            ? body.referenceMonth.trim()
            : dueDate.slice(0, 7);

        const mm = referenceMonth.slice(5, 7);
        const yyyy = referenceMonth.slice(0, 4);
        const description =
          body.description?.trim() || `${base.billingClient.name} — Mensalidade ${mm}/${yyyy}`;

        const created = await this.createInvoiceTx(tx, base, {
          description,
          amountCents,
          dueDate,
          referenceMonth,
          status: 'pending',
        });

        if (base.syncEnabled && base.baseSyncedAt) {
          const evt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: base.baseExternalId,
            invoice: this.buildInvoicePayload(created),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: evt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: created.externalId,
            baseExternalId: base.baseExternalId,
            entityVersion: created.version,
            payloadJson: evt.json,
          });
        }

        return created;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async updateInvoice(
    invoiceId: string,
    body: {
      description?: string;
      amount?: number;
      dueDate?: string;
      referenceMonth?: string;
      paymentMethod?: LeadgerPaymentMethod | null;
    },
  ) {
    try {
      const occurredAt = new Date().toISOString();
      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const existing = await tx.billingInvoice.findUnique({
          where: { id: invoiceId },
          include: { baseConfig: true },
        });
        if (!existing) throw new NotFoundException('Fatura não encontrada.');

        const nextAmountCents =
          body.amount !== undefined ? toCentavos(body.amount, false) : existing.amountCents;
        const nextDueDate = body.dueDate !== undefined ? body.dueDate : existing.dueDate;
        const nextRefMonth = body.referenceMonth !== undefined ? body.referenceMonth : existing.referenceMonth;
        if (!isValidYmdDate(nextDueDate)) throw new BadRequestException('dueDate inválida.');
        if (!isValidReferenceMonth(nextRefMonth)) throw new BadRequestException('referenceMonth inválido.');

        const nextDescription =
          body.description !== undefined ? String(body.description).trim().slice(0, 300) : existing.description;
        if (!nextDescription) throw new BadRequestException('Descrição da fatura é obrigatória.');

        const nextMethod =
          existing.status === 'paid' && body.paymentMethod !== undefined
            ? normalizePaymentMethod(body.paymentMethod)
            : existing.paymentMethod;

        const updated = await tx.billingInvoice.update({
          where: { id: invoiceId },
          data: {
            version: clampVersion(existing.version + 1),
            amountCents: nextAmountCents,
            dueDate: nextDueDate,
            referenceMonth: nextRefMonth,
            description: nextDescription,
            paymentMethod: nextMethod,
          },
        });

        if (existing.baseConfig.syncEnabled && existing.baseConfig.baseSyncedAt) {
          const evt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: existing.baseConfig.baseExternalId,
            invoice: this.buildInvoicePayload(updated),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: evt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: updated.externalId,
            baseExternalId: existing.baseConfig.baseExternalId,
            entityVersion: updated.version,
            payloadJson: evt.json,
          });
        }

        return updated;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async markInvoicePaid(
    invoiceId: string,
    body: { paymentMethod?: string | null; paidAt?: string; observacao?: string; generateNext?: boolean },
  ) {
    try {
      const occurredAt = new Date().toISOString();
      const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
      if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('paidAt inválido.');
      if (body.paymentMethod && !normalizePaymentMethod(body.paymentMethod)) {
        throw new BadRequestException(`paymentMethod inválido. Use: ${VALID_PAYMENT_METHODS.join(', ')}.`);
      }
      const method = normalizePaymentMethod(body.paymentMethod);

      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const inv = await tx.billingInvoice.findUnique({
          where: { id: invoiceId },
          include: { baseConfig: { include: { billingClient: true } } },
        });
        if (!inv) throw new NotFoundException('Fatura não encontrada.');
        if (inv.status === 'cancelled') {
          throw new ConflictException('Não é possível pagar uma fatura cancelada.');
        }

        const nextDue = nextBillingDateYmd(inv.dueDate, inv.baseConfig.billingDay);
        const log = await tx.paymentLog.create({
          data: {
            tenantId: inv.tenantId,
            valor: Number((inv.amountCents / 100).toFixed(2)),
            vencimentoAntes: new Date(`${inv.dueDate}T12:00:00Z`),
            vencimentoApos: new Date(`${nextDue}T12:00:00Z`),
            observacao: body.observacao || (method ? `Pago via ${method}` : null),
          },
        });

        await tx.tenant.update({
          where: { id: inv.tenantId },
          data: { mensalidadeVencimento: new Date(`${nextDue}T12:00:00Z`) },
        });

        const updatedInv = await tx.billingInvoice.update({
          where: { id: invoiceId },
          data: {
            version: clampVersion(inv.version + 1),
            status: 'paid',
            paidAt,
            paymentMethod: method,
            paymentLogId: log.id,
          },
        });

        if (inv.baseConfig.syncEnabled && inv.baseConfig.baseSyncedAt) {
          const evt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: inv.baseConfig.baseExternalId,
            invoice: this.buildInvoicePayload(updatedInv),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: evt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: updatedInv.externalId,
            baseExternalId: inv.baseConfig.baseExternalId,
            entityVersion: updatedInv.version,
            payloadJson: evt.json,
          });
        }

        if (body.generateNext !== false && inv.baseConfig.monthlyAmountCents > 0) {
          const nextRef = nextDue.slice(0, 7);
          const alreadyExists = await tx.billingInvoice.findFirst({
            where: { baseConfigId: inv.baseConfigId, referenceMonth: nextRef, status: 'pending' },
          });
          if (!alreadyExists) {
            const nextInv = await this.createInvoiceTx(tx, inv.baseConfig, {
              description: `${inv.baseConfig.billingClient.name} — Mensalidade ${nextRef.slice(5, 7)}/${nextRef.slice(0, 4)}`,
              amountCents: inv.baseConfig.monthlyAmountCents,
              dueDate: nextDue,
              referenceMonth: nextRef,
              status: 'pending',
            });
            if (inv.baseConfig.syncEnabled && inv.baseConfig.baseSyncedAt) {
              const nextEvt = serializeInvoiceUpsert({
                occurredAt,
                baseExternalId: inv.baseConfig.baseExternalId,
                invoice: this.buildInvoicePayload(nextInv),
              });
              await this.enqueueOutboxTx(tx, {
                eventId: nextEvt.eventId,
                eventType: 'invoice.upsert',
                entityType: 'invoice',
                entityExternalId: nextInv.externalId,
                baseExternalId: inv.baseConfig.baseExternalId,
                entityVersion: nextInv.version,
                payloadJson: nextEvt.json,
              });
            }
          }
        }

        return updatedInv;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  /** Estorno conforme Seção 7: versão maior, status pending ou cancelled, paidAt=null */
  async refundInvoice(
    invoiceId: string,
    body: { targetStatus?: 'pending' | 'cancelled'; reason?: string },
  ) {
    try {
      const targetStatus: LeadgerInvoiceStatus = body?.targetStatus === 'cancelled' ? 'cancelled' : 'pending';
      const occurredAt = new Date().toISOString();

      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const inv = await tx.billingInvoice.findUnique({
          where: { id: invoiceId },
          include: { baseConfig: true },
        });
        if (!inv) throw new NotFoundException('Fatura não encontrada.');
        if (inv.status !== 'paid') {
          throw new BadRequestException('Apenas faturas pagas podem ser estornadas.');
        }

        const updated = await tx.billingInvoice.update({
          where: { id: invoiceId },
          data: {
            version: clampVersion(inv.version + 1),
            status: targetStatus,
            paidAt: null,
            paymentMethod: null,
          },
        });

        await tx.paymentLog.create({
          data: {
            tenantId: inv.tenantId,
            valor: -Number((inv.amountCents / 100).toFixed(2)),
            vencimentoAntes: new Date(`${inv.dueDate}T12:00:00Z`),
            vencimentoApos: new Date(`${inv.dueDate}T12:00:00Z`),
            observacao: `[ESTORNO] ${body?.reason?.trim() || inv.description}`,
          },
        });

        if (inv.baseConfig.syncEnabled && inv.baseConfig.baseSyncedAt) {
          const evt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: inv.baseConfig.baseExternalId,
            invoice: this.buildInvoicePayload(updated),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: evt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: updated.externalId,
            baseExternalId: inv.baseConfig.baseExternalId,
            entityVersion: updated.version,
            payloadJson: evt.json,
          });
        }

        return updated;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async cancelInvoice(invoiceId: string) {
    try {
      const occurredAt = new Date().toISOString();
      return await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const inv = await tx.billingInvoice.findUnique({
          where: { id: invoiceId },
          include: { baseConfig: true },
        });
        if (!inv) throw new NotFoundException('Fatura não encontrada.');
        if (inv.status === 'paid') {
          throw new BadRequestException('Use a opção Estornar para faturas já pagas.');
        }

        const updated = await tx.billingInvoice.update({
          where: { id: invoiceId },
          data: {
            version: clampVersion(inv.version + 1),
            status: 'cancelled',
            paidAt: null,
            paymentMethod: null,
          },
        });

        if (inv.baseConfig.syncEnabled && inv.baseConfig.baseSyncedAt) {
          const evt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: inv.baseConfig.baseExternalId,
            invoice: this.buildInvoicePayload(updated),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: evt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: updated.externalId,
            baseExternalId: inv.baseConfig.baseExternalId,
            entityVersion: updated.version,
            payloadJson: evt.json,
          });
        }

        return updated;
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  // ---------------------------------------------------------------------------
  //  Hooks Seguros e Não-Invasivos para TenantsService
  // ---------------------------------------------------------------------------

  async onTenantUpdated(tenantId: string): Promise<void> {
    try {
      const base = await (this.heartPrisma as any).billingBaseConfig.findUnique({
        where: { tenantId },
        include: { billingClient: true },
      });
      if (!base) return;

      const tenant = await this.heartPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return;

      const occurredAt = new Date().toISOString();
      const nextClientName = (tenant.razaoSocial || tenant.nomeFantasia || tenant.name || base.billingClient.name)
        .trim()
        .slice(0, 200);
      const nextDoc = normalizeDocument(tenant.cnpj);
      const nextEmail = normalizeEmail(tenant.emailContato || tenant.emailContador);
      const nextPhone = normalizePhoneE164(tenant.telefoneContato || tenant.telefone);
      const nextClientStatus: LeadgerClientStatus = tenant.status === 'inactive' ? 'inactive' : 'active';
      const nextNotes = tenant.observacoes ?? null;

      const clientChanged =
        nextClientName !== base.billingClient.name ||
        nextDoc !== base.billingClient.document ||
        nextEmail !== base.billingClient.email ||
        nextPhone !== base.billingClient.phone ||
        nextClientStatus !== base.billingClient.status ||
        nextNotes !== base.billingClient.notes;

      const nextBaseName = (tenant.nomeFantasia || tenant.name || base.baseName).trim().slice(0, 200);
      const nextAmountCents = Math.max(0, Math.round(Number(tenant.mensalidadeValor ?? 0) * 100));
      const nextStatus = mapTenantStatusToLeadgerBaseStatus(tenant.status);
      const baseChanged =
        nextBaseName !== base.baseName ||
        nextAmountCents !== base.monthlyAmountCents ||
        nextStatus !== base.status;

      if (!clientChanged && !baseChanged) return;

      await (this.heartPrisma as any).$transaction(async (tx: any) => {
        let updatedClient = base.billingClient;
        if (clientChanged) {
          updatedClient = await tx.billingClient.update({
            where: { id: base.billingClient.id },
            data: {
              version: clampVersion(base.billingClient.version + 1),
              name: nextClientName,
              document: nextDoc,
              email: nextEmail,
              phone: nextPhone,
              status: nextClientStatus,
              notes: nextNotes,
            },
          });
        }

        let updatedBase = base;
        if (baseChanged) {
          const todayBrt = formatBrtYmd(new Date());
          const effectiveDate = todayBrt >= base.startDate ? todayBrt : base.startDate;
          updatedBase = await tx.billingBaseConfig.update({
            where: { id: base.id },
            data: {
              baseVersion: clampVersion(base.baseVersion + 1),
              baseName: nextBaseName,
              monthlyAmountCents: nextAmountCents,
              status: nextStatus,
              ...(nextAmountCents !== base.monthlyAmountCents ? { effectiveDate } : {}),
            },
          });

          if (nextAmountCents !== base.monthlyAmountCents && nextAmountCents > 0) {
            const pendingToRecalc = await tx.billingInvoice.findMany({
              where: { baseConfigId: base.id, status: 'pending', dueDate: { gte: effectiveDate } },
            });
            for (const inv of pendingToRecalc) {
              await tx.billingInvoice.update({
                where: { id: inv.id },
                data: { amountCents: nextAmountCents, version: clampVersion(inv.version + 1) },
              });
            }
          }
        }

        if (base.syncEnabled && base.baseSyncedAt) {
          if (baseChanged) {
            const evt = serializeBaseUpsertBatch({
              occurredAt,
              client: this.buildClientPayload(updatedClient, false),
              base: this.buildBasePayload(updatedBase),
              invoices: [],
            });
            await this.enqueueOutboxTx(tx, {
              eventId: evt.primaryEventId,
              eventType: 'base.upsert',
              entityType: 'base',
              entityExternalId: updatedBase.baseExternalId,
              baseExternalId: updatedBase.baseExternalId,
              entityVersion: updatedBase.baseVersion,
              payloadJson: evt.primaryJson,
            });
          } else if (clientChanged) {
            const evt = serializeClientUpsert({
              occurredAt,
              client: this.buildClientPayload(updatedClient, false),
            });
            await this.enqueueOutboxTx(tx, {
              eventId: evt.eventId,
              eventType: 'client.upsert',
              entityType: 'client',
              entityExternalId: updatedClient.externalId,
              baseExternalId: updatedBase.baseExternalId,
              entityVersion: updatedClient.version,
              payloadJson: evt.json,
            });
          }
        }
      });
    } catch (err) {
      if (isMissingLeadgerTablesError(err)) return;
      this.logger.warn(`Falha ao propagar alteração do tenant ${tenantId} para fila Leadger: ${(err as any)?.message}`);
    }
  }

  async onTenantLogoUpdated(tenantId: string, logoId: string): Promise<void> {
    try {
      const base = await (this.heartPrisma as any).billingBaseConfig.findUnique({
        where: { tenantId },
        include: { billingClient: true },
      });
      if (!base) return;

      const occurredAt = new Date().toISOString();
      const cfg = this.getRuntimeConfig();
      await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const updatedClient = await tx.billingClient.update({
          where: { id: base.billingClient.id },
          data: {
            version: clampVersion(base.billingClient.version + 1),
            photoLogoId: logoId,
            photoVersion: Math.max(1, base.billingClient.photoVersion + 1),
            photoRemoved: false,
          },
        });

        if (base.syncEnabled && base.baseSyncedAt && cfg.photoSyncEnabled) {
          const payload = this.buildClientPayload(updatedClient, true);
          if (payload.photo) {
            const evt = serializeClientUpsert({ occurredAt, client: payload });
            await this.enqueueOutboxTx(tx, {
              eventId: evt.eventId,
              eventType: 'client.upsert',
              entityType: 'client',
              entityExternalId: updatedClient.externalId,
              baseExternalId: base.baseExternalId,
              entityVersion: updatedClient.version,
              payloadJson: evt.json,
            });
          }
        }
      });
    } catch (err) {
      if (isMissingLeadgerTablesError(err)) return;
      this.logger.warn(`Falha ao atualizar foto Leadger do tenant ${tenantId}: ${(err as any)?.message}`);
    }
  }

  async onTenantPaymentRegistered(params: {
    tenantId: string;
    paymentLogId: string;
    amountReais: number;
    vencimentoAntes: Date;
    vencimentoApos: Date;
    paymentMethod?: string | null;
  }): Promise<void> {
    try {
      const base = await (this.heartPrisma as any).billingBaseConfig.findUnique({
        where: { tenantId: params.tenantId },
        include: { billingClient: true },
      });
      if (!base) return;

      const amountCents = Math.round(Number(params.amountReais) * 100);
      if (amountCents <= 0) return;

      const occurredAt = new Date().toISOString();
      const paidAt = new Date();
      const method = normalizePaymentMethod(params.paymentMethod);
      const dueBefore = formatBrtYmd(params.vencimentoAntes);
      const refMonth = dueBefore.slice(0, 7);
      const nextDue = formatBrtYmd(params.vencimentoApos);
      const nextRef = nextDue.slice(0, 7);

      await (this.heartPrisma as any).$transaction(async (tx: any) => {
        const pendingInv = await tx.billingInvoice.findFirst({
          where: { baseConfigId: base.id, status: 'pending' },
          orderBy: { dueDate: 'asc' },
        });

        let paidInv: any;
        if (pendingInv) {
          paidInv = await tx.billingInvoice.update({
            where: { id: pendingInv.id },
            data: {
              version: clampVersion(pendingInv.version + 1),
              status: 'paid',
              paidAt,
              paymentMethod: method,
              paymentLogId: params.paymentLogId,
            },
          });
        } else {
          paidInv = await this.createInvoiceTx(tx, base, {
            description: `${base.billingClient.name} — Mensalidade ${refMonth.slice(5, 7)}/${refMonth.slice(0, 4)}`,
            amountCents,
            dueDate: dueBefore,
            referenceMonth: refMonth,
            status: 'paid',
            paidAt,
            paymentMethod: method,
            paymentLogId: params.paymentLogId,
          });
        }

        let nextInv: any = null;
        if (base.monthlyAmountCents > 0) {
          const existsNext = await tx.billingInvoice.findFirst({
            where: { baseConfigId: base.id, referenceMonth: nextRef, status: 'pending' },
          });
          if (!existsNext) {
            nextInv = await this.createInvoiceTx(tx, base, {
              description: `${base.billingClient.name} — Mensalidade ${nextRef.slice(5, 7)}/${nextRef.slice(0, 4)}`,
              amountCents: base.monthlyAmountCents,
              dueDate: nextDue,
              referenceMonth: nextRef,
              status: 'pending',
            });
          }
        }

        if (base.syncEnabled && base.baseSyncedAt) {
          const paidEvt = serializeInvoiceUpsert({
            occurredAt,
            baseExternalId: base.baseExternalId,
            invoice: this.buildInvoicePayload(paidInv),
          });
          await this.enqueueOutboxTx(tx, {
            eventId: paidEvt.eventId,
            eventType: 'invoice.upsert',
            entityType: 'invoice',
            entityExternalId: paidInv.externalId,
            baseExternalId: base.baseExternalId,
            entityVersion: paidInv.version,
            payloadJson: paidEvt.json,
          });

          if (nextInv) {
            const nextEvt = serializeInvoiceUpsert({
              occurredAt,
              baseExternalId: base.baseExternalId,
              invoice: this.buildInvoicePayload(nextInv),
            });
            await this.enqueueOutboxTx(tx, {
              eventId: nextEvt.eventId,
              eventType: 'invoice.upsert',
              entityType: 'invoice',
              entityExternalId: nextInv.externalId,
              baseExternalId: base.baseExternalId,
              entityVersion: nextInv.version,
              payloadJson: nextEvt.json,
            });
          }
        }
      });
    } catch (err) {
      if (isMissingLeadgerTablesError(err)) return;
      this.logger.warn(`Falha ao sincronizar pagamento do tenant ${params.tenantId} para Leadger: ${(err as any)?.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Conciliação Inicial (Seção 5) & Carga Inicial Controlada
  // ---------------------------------------------------------------------------

  async exportReconciliation() {
    try {
      const tenants = await this.heartPrisma.tenant.findMany({
        include: {
          billingBaseConfig: { include: { billingClient: true } },
          billingInvoices: { orderBy: { dueDate: 'desc' }, take: 24 },
          paymentLogs: { orderBy: { createdAt: 'desc' }, take: 12 },
        },
        orderBy: { name: 'asc' },
      });

      return tenants.map((t: any) => {
        const cfg = t.billingBaseConfig;
        const client = cfg?.billingClient;
        return {
          tenantId: t.id,
          databaseName: t.databaseName,
          tenantName: t.nomeFantasia || t.name || t.razaoSocial || '',
          clientExternalId: client?.externalId ?? makeSafeExternalId('cli', t.id),
          clientName: client?.name ?? (t.razaoSocial || t.nomeFantasia || t.name || ''),
          document: client?.document ?? normalizeDocument(t.cnpj),
          email: client?.email ?? normalizeEmail(t.emailContato || t.emailContador),
          phone: client?.phone ?? normalizePhoneE164(t.telefoneContato || t.telefone),
          baseExternalId: cfg?.baseExternalId ?? makeSafeExternalId('base', t.id),
          baseName: cfg?.baseName ?? (t.nomeFantasia || t.name || ''),
          monthlyAmountCents: cfg?.monthlyAmountCents ?? Math.round(Number(t.mensalidadeValor ?? 0) * 100),
          nextDueDate: t.mensalidadeVencimento ? formatBrtYmd(new Date(t.mensalidadeVencimento)) : null,
          status: cfg?.status ?? mapTenantStatusToLeadgerBaseStatus(t.status),
          syncEnabled: Boolean(cfg?.syncEnabled),
          baseSyncedAt: cfg?.baseSyncedAt ?? null,
          openInvoices: (t.billingInvoices ?? []).map((inv: any) => ({
            externalId: inv.externalId,
            referenceMonth: inv.referenceMonth,
            dueDate: inv.dueDate,
            amountCents: inv.amountCents,
            status: inv.status,
          })),
          recentPaymentLogsCount: t.paymentLogs?.length ?? 0,
        };
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async enqueueBatchSync(tenantIds: string[]) {
    if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
      throw new BadRequestException('Informe ao menos 1 empresa para ativar sincronização.');
    }
    if (tenantIds.length > 25) {
      throw new BadRequestException('Por segurança (Seção 10), sincronize em lotes de até 25 bases por vez.');
    }

    const results: { tenantId: string; status: 'enqueued' | 'error'; detail: string }[] = [];
    for (const id of tenantIds) {
      try {
        const res = await this.enqueueBaseSync(id);
        results.push({ tenantId: id, status: 'enqueued', detail: res.eventId });
      } catch (err: any) {
        results.push({ tenantId: id, status: 'error', detail: err?.message || 'Erro ao enfileirar base' });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  //  Monitor de Fila & Worker Transacional HMAC-SHA256
  // ---------------------------------------------------------------------------

  async listOutbox(filterStatus?: string) {
    try {
      const where: any = {};
      if (filterStatus && filterStatus !== 'ALL') {
        where.status = filterStatus;
      }
      const [countsRaw, items] = await Promise.all([
        (this.heartPrisma as any).leadgerOutboxEvent.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        (this.heartPrisma as any).leadgerOutboxEvent.findMany({
          where,
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 100,
        }),
      ]);

      const counts: Record<LeadgerOutboxStatus, number> = {
        PENDING: 0,
        PROCESSING: 0,
        DELIVERED: 0,
        FAILED_ACTION_REQUIRED: 0,
        DEAD_LETTER: 0,
      };
      for (const row of countsRaw) {
        counts[row.status as LeadgerOutboxStatus] = row._count._all;
      }

      return { counts, items };
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  async retryOutboxEvent(outboxId: string) {
    try {
      const evt = await (this.heartPrisma as any).leadgerOutboxEvent.findUnique({ where: { id: outboxId } });
      if (!evt) throw new NotFoundException('Evento na fila não encontrado.');
      if (evt.status === 'DELIVERED') {
        throw new BadRequestException('Este evento já foi confirmado como entregue pelo Leadger.');
      }

      return await (this.heartPrisma as any).leadgerOutboxEvent.update({
        where: { id: outboxId },
        data: {
          status: 'PENDING',
          nextAttemptAt: new Date(),
          lockedAt: null,
        },
      });
    } catch (err) {
      this.assertNotMissingTables(err);
    }
  }

  @Cron('*/15 * * * * *')
  async handleOutboxCron(): Promise<void> {
    if (this.workerRunning) return;
    const cfg = this.getRuntimeConfig();
    if (!cfg.webhookEnabled || !cfg.configured) return;

    this.workerRunning = true;
    try {
      await this.processOutboxBatch();
    } catch (err) {
      if (!isMissingLeadgerTablesError(err)) {
        this.logger.warn(`Erro no worker Leadger Outbox: ${(err as any)?.message}`);
      }
    } finally {
      this.workerRunning = false;
    }
  }

  @Cron('15 6 * * *')
  async handleMonthlyInvoiceGenerationCron(): Promise<void> {
    if (this.monthlyCronRunning) return;
    this.monthlyCronRunning = true;
    try {
      const bases = await (this.heartPrisma as any).billingBaseConfig.findMany({
        where: { status: 'active', monthlyAmountCents: { gt: 0 } },
        include: { billingClient: true },
      });

      const todayBrt = formatBrtYmd(new Date());
      const currentMonth = todayBrt.slice(0, 7);

      for (const base of bases) {
        if (base.endDate && todayBrt > base.endDate) continue;
        const hasMonthInv = await (this.heartPrisma as any).billingInvoice.findFirst({
          where: { baseConfigId: base.id, referenceMonth: currentMonth },
        });
        if (hasMonthInv) continue;

        const year = Number(currentMonth.slice(0, 4));
        const month = Number(currentMonth.slice(5, 7));
        const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const dueDay = Math.min(base.billingDay, maxDay);
        const dueDate = `${currentMonth}-${String(dueDay).padStart(2, '0')}`;

        await (this.heartPrisma as any).$transaction(async (tx: any) => {
          const created = await this.createInvoiceTx(tx, base, {
            description: `${base.billingClient.name} — Mensalidade ${String(month).padStart(2, '0')}/${year}`,
            amountCents: base.monthlyAmountCents,
            dueDate,
            referenceMonth: currentMonth,
            status: 'pending',
          });
          if (base.syncEnabled && base.baseSyncedAt) {
            const evt = serializeInvoiceUpsert({
              occurredAt: new Date().toISOString(),
              baseExternalId: base.baseExternalId,
              invoice: this.buildInvoicePayload(created),
            });
            await this.enqueueOutboxTx(tx, {
              eventId: evt.eventId,
              eventType: 'invoice.upsert',
              entityType: 'invoice',
              entityExternalId: created.externalId,
              baseExternalId: base.baseExternalId,
              entityVersion: created.version,
              payloadJson: evt.json,
            });
          }
        });
      }
    } catch (err) {
      if (!isMissingLeadgerTablesError(err)) {
        this.logger.warn(`Erro no cron mensal de faturas Leadger: ${(err as any)?.message}`);
      }
    } finally {
      this.monthlyCronRunning = false;
    }
  }

  async processOutboxBatch(limit = 20): Promise<{ processed: number; delivered: number; deferred: number }> {
    const cfg = this.getRuntimeConfig();
    if (!cfg.configured) {
      throw new BadRequestException(
        'Configure LEADGER_WEBHOOK_URL, LEADGER_WEBHOOK_SOURCE e LEADGER_WEBHOOK_SECRET no servidor antes de enviar.',
      );
    }

    const now = new Date();
    // Libera locks órfãos após restart/crash (timeout de 120s)
    await (this.heartPrisma as any).leadgerOutboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        lockedAt: { lt: new Date(now.getTime() - PROCESSING_LOCK_TIMEOUT_MS) },
      },
      data: { status: 'PENDING', lockedAt: null },
    });

    const candidates = await (this.heartPrisma as any).leadgerOutboxEvent.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: now },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: Math.max(1, Math.min(50, limit)),
    });

    let processed = 0;
    let delivered = 0;
    let deferred = 0;

    for (const candidate of candidates) {
      // Ordenação estrita: invoice.upsert (ou client.upsert de base vinculada) aguarda base.upsert anterior
      if (candidate.eventType !== 'base.upsert' && candidate.baseExternalId) {
        const pendingBase = await (this.heartPrisma as any).leadgerOutboxEvent.findFirst({
          where: {
            baseExternalId: candidate.baseExternalId,
            eventType: 'base.upsert',
            status: { in: ['PENDING', 'PROCESSING', 'FAILED_ACTION_REQUIRED'] },
            createdAt: { lte: candidate.createdAt },
          },
        });
        if (pendingBase) {
          deferred++;
          continue;
        }
      }

      const claimed = await (this.heartPrisma as any).leadgerOutboxEvent.updateMany({
        where: { id: candidate.id, status: 'PENDING' },
        data: { status: 'PROCESSING', lockedAt: new Date() },
      });
      if (!claimed || claimed.count === 0) continue;

      processed++;
      const outcome = await this.deliverSingleEvent(candidate, cfg);
      if (outcome === 'delivered') delivered++;
    }

    return { processed, delivered, deferred };
  }

  private async deliverSingleEvent(
    evt: {
      id: string;
      eventId: string;
      eventType: string;
      entityType: string;
      entityExternalId: string;
      baseExternalId: string | null;
      entityVersion: number;
      payloadJson: string;
      attempts: number;
    },
    cfg: { url: string; source: string; secret: string },
  ): Promise<'delivered' | 'requeued' | 'failed'> {
    // Timestamp em segundos e assinatura NOVA a cada tentativa mantendo eventId e bytes originais idênticos
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signLeadgerPayload({
      timestamp,
      source: cfg.source,
      secret: cfg.secret,
      payloadJson: evt.payloadJson,
    });

    const nextAttempts = evt.attempts + 1;
    let status = 0;
    let bodyText = '';
    let parsed: any = null;
    let retryAfterHeader: string | null = null;
    let networkErrMsg: string | null = null;

    try {
      const response = await this.httpImpl(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Leadger-Timestamp': timestamp,
          'X-Leadger-Signature': signature,
        },
        body: evt.payloadJson,
        signal: AbortSignal.timeout(20_000),
      });
      status = response.status;
      retryAfterHeader = response.headers.get('retry-after');
      bodyText = await response.text();
      try {
        parsed = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        parsed = null;
      }
    } catch (err: any) {
      networkErrMsg = err?.message || 'Erro de rede/timeout ao conectar no Leadger.';
    }

    if (status === 200 && parsed?.ok === true) {
      await (this.heartPrisma as any).$transaction(async (tx: any) => {
        await tx.leadgerOutboxEvent.update({
          where: { id: evt.id },
          data: {
            status: 'DELIVERED',
            attempts: nextAttempts,
            lockedAt: null,
            deliveredAt: new Date(),
            lastHttpStatus: 200,
            lastErrorCode: null,
            lastErrorMessage: null,
            responseJson: bodyText.slice(0, 4000),
          },
        });

        if (evt.eventType === 'base.upsert' && evt.baseExternalId) {
          await tx.billingBaseConfig.updateMany({
            where: { baseExternalId: evt.baseExternalId },
            data: {
              baseSyncedAt: new Date(),
              lastDeliveredBaseVersion: evt.entityVersion,
            },
          });
        }

        if (evt.eventType === 'client.upsert') {
          const photoStatus = parsed?.photo?.status;
          const photoVer = Number(parsed?.photo?.version ?? 0);
          if (photoStatus === 'stored' || photoStatus === 'unchanged') {
            await tx.billingClient.updateMany({
              where: { externalId: evt.entityExternalId },
              data: {
                lastSyncedPhotoVersion: photoVer > 0 ? photoVer : evt.entityVersion,
                photoRemoved: false,
              },
            });
          } else if (photoStatus === 'removed') {
            await tx.billingClient.updateMany({
              where: { externalId: evt.entityExternalId },
              data: {
                lastSyncedPhotoVersion: photoVer > 0 ? photoVer : evt.entityVersion,
                photoRemoved: false,
              },
            });
          }
        }
      });
      return 'delivered';
    }

    const errorCode = String(parsed?.error || parsed?.code || (networkErrMsg ? 'network_error' : `http_${status || 0}`));
    const errorMessage = String(
      parsed?.message || networkErrMsg || bodyText.slice(0, 500) || `Resposta HTTP ${status}`,
    );

    // 400, 401, 404, 409, 413, 415, 422 -> intervenção necessária (nunca retry cego!)
    const isPermanentActionRequired = [400, 401, 404, 409, 413, 415, 422].includes(status);

    if (isPermanentActionRequired) {
      await (this.heartPrisma as any).leadgerOutboxEvent.update({
        where: { id: evt.id },
        data: {
          status: 'FAILED_ACTION_REQUIRED',
          attempts: nextAttempts,
          lockedAt: null,
          lastHttpStatus: status,
          lastErrorCode: errorCode.slice(0, 120),
          lastErrorMessage: errorMessage.slice(0, 2000),
          responseJson: bodyText.slice(0, 4000) || null,
        },
      });
      return 'failed';
    }

    // 429, 5xx, timeout ou rede -> backoff exponencial com jitter preservando eventId e bytes exatos
    if (nextAttempts >= MAX_TRANSIENT_RETRIES) {
      await (this.heartPrisma as any).leadgerOutboxEvent.update({
        where: { id: evt.id },
        data: {
          status: 'DEAD_LETTER',
          attempts: nextAttempts,
          lockedAt: null,
          lastHttpStatus: status || null,
          lastErrorCode: errorCode.slice(0, 120),
          lastErrorMessage: errorMessage.slice(0, 2000),
          responseJson: bodyText.slice(0, 4000) || null,
        },
      });
      return 'failed';
    }

    const delayMs = computeRetryDelayMs(evt.attempts, retryAfterHeader);
    await (this.heartPrisma as any).leadgerOutboxEvent.update({
      where: { id: evt.id },
      data: {
        status: 'PENDING',
        attempts: nextAttempts,
        lockedAt: null,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastHttpStatus: status || null,
        lastErrorCode: errorCode.slice(0, 120),
        lastErrorMessage: errorMessage.slice(0, 2000),
        responseJson: bodyText.slice(0, 4000) || null,
      },
    });
    return 'requeued';
  }
}
