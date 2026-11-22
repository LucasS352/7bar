import { BadRequestException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import type {
  LeadgerBasePayload,
  LeadgerBaseStatus,
  LeadgerClientPayload,
  LeadgerClientUpsertEnvelope,
  LeadgerInvoicePayload,
  LeadgerInvoiceUpsertEnvelope,
  LeadgerPaymentMethod,
} from './leadger.types';

export const MAX_LEADGER_PAYLOAD_BYTES = 256 * 1024;
export const MAX_LEADGER_CENTAVOS = 2_147_483_647;
export const MAX_LEADGER_VERSION = 2_147_483_647;
export const MAX_INVOICES_PER_BASE_UPSERT = 60;
export const LEADGER_BACKOFF_SECONDS = [10, 30, 60, 300, 900, 3600] as const;

const EXTERNAL_ID_REGEX = /^[A-Za-z0-9_.:-]{1,120}$/;
const YMD_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const YM_REGEX = /^(\d{4})-(\d{2})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const VALID_PAYMENT_METHODS: readonly LeadgerPaymentMethod[] = [
  'pix',
  'boleto',
  'credit_card',
  'bank_transfer',
  'cash',
];

export function isValidExternalId(value: string): boolean {
  return EXTERNAL_ID_REGEX.test(value);
}

export function makeSafeExternalId(prefix: string, rawId: string): string {
  const cleaned = `${prefix}-${rawId}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 120);
  if (!isValidExternalId(cleaned)) {
    throw new BadRequestException(`Identificador externo inválido para Leadger: "${cleaned}"`);
  }
  return cleaned;
}

export function makeEventId(prefix: string): string {
  const raw = `${prefix}-${randomUUID()}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 120);
  return raw;
}

export function toCentavos(value: unknown, allowZero = false): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new BadRequestException('Valor monetário inválido para o contrato Leadger.');
  }
  const cents = Math.round(num * 100);
  if (allowZero ? cents < 0 : cents <= 0) {
    throw new BadRequestException(
      allowZero ? 'Valor em centavos não pode ser negativo.' : 'Valor em centavos deve ser maior que zero.',
    );
  }
  if (cents > MAX_LEADGER_CENTAVOS) {
    throw new BadRequestException(`Valor excede limite máximo de ${MAX_LEADGER_CENTAVOS} centavos.`);
  }
  return cents;
}

export function clampVersion(version: number): number {
  const v = Math.trunc(version);
  if (!Number.isFinite(v) || v < 1 || v > MAX_LEADGER_VERSION) {
    throw new BadRequestException(`Versão inválida (${version}). Deve estar entre 1 e ${MAX_LEADGER_VERSION}.`);
  }
  return v;
}

export function isValidYmdDate(ymd: string): boolean {
  const m = YMD_REGEX.exec(ymd);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function isValidReferenceMonth(ym: string): boolean {
  const m = YM_REGEX.exec(ym);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

export function formatUtcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Formata Date no fuso Brasil UTC-03:00 como YYYY-MM-DD */
export function formatBrtYmd(date: Date): string {
  const brt = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export function clampBillingDay(day: unknown): number {
  const parsed = Math.trunc(Number(day));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
    throw new BadRequestException('billingDay deve ser um inteiro entre 1 e 31.');
  }
  return parsed;
}

/** Calcula YYYY-MM-DD do mês seguinte preservando o billingDay original (sem drift de fevereiro) */
export function nextBillingDateYmd(fromYmd: string, billingDay: number): string {
  if (!isValidYmdDate(fromYmd)) {
    throw new BadRequestException(`Data base inválida: "${fromYmd}"`);
  }
  const safeDay = clampBillingDay(billingDay);
  const [y, m] = fromYmd.split('-').map(Number);
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const clamped = Math.min(safeDay, daysInNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

export function normalizeDocument(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 14) return digits;
  const trimmed = String(raw).trim();
  return trimmed ? trimmed.slice(0, 32) : null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed.slice(0, 200) : null;
}

export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`;
  }
  return `+${digits}`.slice(0, 20);
}

export function normalizePaymentMethod(raw: unknown): LeadgerPaymentMethod | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim().toLowerCase();
  if ((VALID_PAYMENT_METHODS as readonly string[]).includes(s)) {
    return s as LeadgerPaymentMethod;
  }
  return null;
}

export function mapTenantStatusToLeadgerBaseStatus(tenantStatus: string | null | undefined): LeadgerBaseStatus {
  const s = String(tenantStatus ?? 'active').trim().toLowerCase();
  if (s === 'inactive' || s === 'cancelled') return 'cancelled';
  if (s === 'paused' || s === 'suspended') return 'paused';
  return 'active';
}

function isIpv4OrIpv6Literal(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(':')) return true;
  return false;
}

/**
 * Monta sourceUrl estritamente conforme Seção 11 do Contrato v1:
 * HTTPS, porta padrão 443, host público aprovado sem IP/localhost/credenciais/fragmento.
 */
export function buildSafeLeadgerPhotoUrl(publicAppUrl: string | undefined, logoId: string | null | undefined): string | null {
  if (!publicAppUrl || !logoId || !/^[A-Za-z0-9._-]+$/.test(logoId)) return null;
  let parsed: URL;
  try {
    parsed = new URL(publicAppUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.port && parsed.port !== '443') return null;
  if (parsed.username || parsed.password || parsed.hash) return null;

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    isIpv4OrIpv6Literal(host)
  ) {
    return null;
  }

  return `${parsed.origin}/api/tenants/uploads/logos/${encodeURIComponent(logoId)}`;
}

/** Assinatura HMAC-SHA256 com segredo UTF-8 sobre `${timestamp}.${source}.${bytes}` */
export function signLeadgerPayload(params: {
  timestamp: string;
  source: string;
  secret: string;
  payloadJson: string;
}): string {
  const signature = createHmac('sha256', params.secret)
    .update(`${params.timestamp}.${params.source}.`)
    .update(Buffer.from(params.payloadJson, 'utf8'))
    .digest('hex');
  return `sha256=${signature}`;
}

export function assertPayloadUnderLimit(json: string): void {
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > MAX_LEADGER_PAYLOAD_BYTES) {
    throw new BadRequestException(
      `Payload do evento Leadger (${bytes} bytes) ultrapassa limite de ${MAX_LEADGER_PAYLOAD_BYTES} bytes.`,
    );
  }
}

export function serializeBaseUpsertBatch(params: {
  occurredAt: string;
  client: LeadgerClientPayload;
  base: LeadgerBasePayload;
  invoices: LeadgerInvoicePayload[];
}): { primaryEventId: string; primaryJson: string; extraInvoices: { eventId: string; externalId: string; version: number; json: string }[] } {
  const firstBatch = params.invoices.slice(0, MAX_INVOICES_PER_BASE_UPSERT);
  const overflow = params.invoices.slice(MAX_INVOICES_PER_BASE_UPSERT);

  const primaryEventId = makeEventId(`evt-base-${params.base.externalId}-v${params.base.version}`);
  const primaryEnvelope = {
    schemaVersion: 1 as const,
    eventId: primaryEventId,
    eventType: 'base.upsert' as const,
    occurredAt: params.occurredAt,
    data: {
      client: params.client,
      base: params.base,
      invoices: firstBatch,
    },
  };
  const primaryJson = JSON.stringify(primaryEnvelope);
  assertPayloadUnderLimit(primaryJson);

  const extraInvoices = overflow.map((inv) => {
    const built = serializeInvoiceUpsert({
      occurredAt: params.occurredAt,
      baseExternalId: params.base.externalId,
      invoice: inv,
    });
    return {
      eventId: built.eventId,
      externalId: inv.externalId,
      version: inv.version,
      json: built.json,
    };
  });

  return { primaryEventId, primaryJson, extraInvoices };
}

export function serializeInvoiceUpsert(params: {
  occurredAt: string;
  baseExternalId: string;
  invoice: LeadgerInvoicePayload;
}): { eventId: string; json: string } {
  if (params.invoice.amount <= 0) {
    throw new BadRequestException('Fatura enviada ao Leadger deve ter valor maior que zero.');
  }
  if (params.invoice.status === 'paid' && !params.invoice.paidAt) {
    throw new BadRequestException('Fatura com status "paid" exige paidAt.');
  }
  if (params.invoice.status !== 'paid' && params.invoice.paidAt !== null) {
    throw new BadRequestException('Fatura pendente ou cancelada deve ter paidAt = null.');
  }

  const eventId = makeEventId(`evt-fat-${params.invoice.externalId}-v${params.invoice.version}`);
  const envelope: LeadgerInvoiceUpsertEnvelope = {
    schemaVersion: 1,
    eventId,
    eventType: 'invoice.upsert',
    occurredAt: params.occurredAt,
    data: {
      baseExternalId: params.baseExternalId,
      invoice: params.invoice,
    },
  };
  const json = JSON.stringify(envelope);
  assertPayloadUnderLimit(json);
  return { eventId, json };
}

export function serializeClientUpsert(params: {
  occurredAt: string;
  client: LeadgerClientPayload;
}): { eventId: string; json: string } {
  const eventId = makeEventId(`evt-cli-${params.client.externalId}-v${params.client.version}`);
  const envelope: LeadgerClientUpsertEnvelope = {
    schemaVersion: 1,
    eventId,
    eventType: 'client.upsert',
    occurredAt: params.occurredAt,
    data: params.client,
  };
  const json = JSON.stringify(envelope);
  assertPayloadUnderLimit(json);
  return { eventId, json };
}

export function computeRetryDelayMs(attemptIndex: number, retryAfterHeader?: string | null, randomFactor = Math.random()): number {
  if (retryAfterHeader) {
    const trimmed = retryAfterHeader.trim();
    const numericSeconds = Number(trimmed);
    if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
      return Math.min(numericSeconds * 1000, 3600_000);
    }
    const targetMs = Date.parse(trimmed);
    if (Number.isFinite(targetMs)) {
      const diff = targetMs - Date.now();
      if (diff > 0) return Math.min(diff, 3600_000);
    }
  }
  const baseSec = LEADGER_BACKOFF_SECONDS[Math.min(Math.max(0, attemptIndex), LEADGER_BACKOFF_SECONDS.length - 1)];
  const jitter = 0.85 + Math.max(0, Math.min(1, randomFactor)) * 0.3; // +-15%
  return Math.round(baseSec * 1000 * jitter);
}
