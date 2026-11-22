export type LeadgerClientStatus = 'active' | 'inactive';
export type LeadgerBaseStatus = 'active' | 'paused' | 'cancelled';
export type LeadgerInvoiceStatus = 'pending' | 'paid' | 'cancelled';
export type LeadgerPaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'bank_transfer' | 'cash';
export type LeadgerEventType = 'base.upsert' | 'invoice.upsert' | 'client.upsert';
export type LeadgerOutboxStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'FAILED_ACTION_REQUIRED'
  | 'DEAD_LETTER';

export interface LeadgerPhotoPayload {
  sourceUrl: string;
  version: number;
}

export interface LeadgerClientPayload {
  externalId: string;
  version: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  status: LeadgerClientStatus;
  notes: string | null;
  photo?: LeadgerPhotoPayload | null;
}

export interface LeadgerBasePayload {
  externalId: string;
  version: number;
  name: string;
  monthlyAmount: number;
  billingDay: number;
  startDate: string;
  endDate: string | null;
  effectiveDate: string;
  status: LeadgerBaseStatus;
}

export interface LeadgerInvoicePayload {
  externalId: string;
  version: number;
  description: string;
  amount: number;
  dueDate: string;
  referenceMonth: string;
  status: LeadgerInvoiceStatus;
  paidAt: string | null;
  paymentMethod: LeadgerPaymentMethod | null;
}

export interface LeadgerBaseUpsertEnvelope {
  schemaVersion: 1;
  eventId: string;
  eventType: 'base.upsert';
  occurredAt: string;
  data: {
    client: LeadgerClientPayload;
    base: LeadgerBasePayload;
    invoices: LeadgerInvoicePayload[];
  };
}

export interface LeadgerInvoiceUpsertEnvelope {
  schemaVersion: 1;
  eventId: string;
  eventType: 'invoice.upsert';
  occurredAt: string;
  data: {
    baseExternalId: string;
    invoice: LeadgerInvoicePayload;
  };
}

export interface LeadgerClientUpsertEnvelope {
  schemaVersion: 1;
  eventId: string;
  eventType: 'client.upsert';
  occurredAt: string;
  data: LeadgerClientPayload;
}

export type LeadgerWebhookEnvelope =
  | LeadgerBaseUpsertEnvelope
  | LeadgerInvoiceUpsertEnvelope
  | LeadgerClientUpsertEnvelope;

export interface LeadgerWebhookConfigStatus {
  tablesReady: boolean;
  webhookEnabled: boolean;
  photoSyncEnabled: boolean;
  configured: boolean;
  hasUrl: boolean;
  hasSource: boolean;
  hasSecret: boolean;
  urlHost: string | null;
  source: string | null;
  photoPublicHost: string | null;
  photoHostValid: boolean;
}
